const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// Подключение к базе данных SQLite
const db = new sqlite3.Database("./db.sqlite", (err) => {
    if (err) {
        console.error("Ошибка при подключении к базе:", err.message);
    } else {
        console.log("Подключение к базе SQLite успешно");
    }
});

// Создаем таблицу, если она не существует
db.run(`CREATE TABLE IF NOT EXISTS usersScores (
    user_id TEXT PRIMARY KEY,
    username TEXT,
    correct INTEGER DEFAULT 0,
    wrong INTEGER DEFAULT 0
)`);

// Хранение активных игровых сессий
let gameSessions = {}; // { user_id: color }

// Генерация цвета карты
app.post("/start_round", (req, res) => {
    const { user_id } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ error: "user_id is required" });
    }

    const color = Math.random() < 0.5 ? "white" : "black";
    gameSessions[user_id] = color;

    res.json({ message: "Round started. Make your guess!" });
});

// Проверка ответа пользователя и сохранение статистики в БД
app.post("/check_guess", (req, res) => {
    const { user_id, guess } = req.body;

    if (!user_id || !guess) {
        return res.status(400).json({ error: "user_id and guess are required" });
    }

    const correctColor = gameSessions[user_id];

    if (!correctColor) {
        return res.status(400).json({ error: "No active round for this user" });
    }

    const isCorrect = guess === correctColor;
    delete gameSessions[user_id];

    // Обновление статистики в базе только если пользователь действительно играл
    // Если записи для данного user_id нет, вставляем; если есть — обновляем.
    db.get("SELECT * FROM usersScores WHERE user_id = ?", [user_id], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: "Database error" });
        }
        
        if (row) {
            // Обновляем статистику
            const newCorrect = row.correct + (isCorrect ? 1 : 0);
            const newWrong = row.wrong + (isCorrect ? 0 : 1);
            db.run("UPDATE usersScores SET correct = ?, wrong = ? WHERE user_id = ?", [newCorrect, newWrong, user_id]);
        } else {
            // Вставляем новую запись
            db.run("INSERT INTO usersScores (user_id, username, correct, wrong) VALUES (?, ?, ?, ?)", 
                [user_id, "Игрок", isCorrect ? 1 : 0, isCorrect ? 0 : 1]);
        }
        
        res.json({ correct: isCorrect, color: correctColor });
    });
});

// Получение статистики игрока из базы
app.get("/get_stats", (req, res) => {
    const { user_id } = req.query;
    
    db.get("SELECT correct, wrong, username FROM usersScores WHERE user_id = ?", [user_id], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: "Database error" });
        }
        
        if (!row) {
            return res.json({ username: "Игрок", correct: 0, wrong: 0 });
        }
        res.json(row);
    });
});

// Получение списка лучших игроков (по разнице верных-неверных), только если общее количество ответов (correct + wrong) ≥ 200
app.get("/leaderboard", (req, res) => {
    let sortedUsers = Object.entries(usersScores)
        .filter(([, data]) => (data.correct + data.wrong) >= 200)
        .sort(([, a], [, b]) => (b.correct - b.wrong) - (a.correct - a.wrong))
        .slice(0, 5)
        .map(([id, data]) => ({ user_id: id, ...data }));

    res.json(sortedUsers);
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));