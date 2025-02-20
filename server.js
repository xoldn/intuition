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

// Создаем таблицу с полями correct и wrong
db.run(`CREATE TABLE IF NOT EXISTS usersScores (
    user_id TEXT PRIMARY KEY,
    username TEXT,
    correct INTEGER DEFAULT 0,
    wrong INTEGER DEFAULT 0
)`);

// Хранение активных игровых сессий
let gameSessions = {}; // { user_id: { color: string, timestamp: number } }

// Очистка старых сессий каждые 5 минут
setInterval(() => {
    const now = Date.now();
    Object.keys(gameSessions).forEach(userId => {
        if (now - gameSessions[userId].timestamp > 5 * 60 * 1000) {
            delete gameSessions[userId];
        }
    });
}, 5 * 60 * 1000);

// Генерация цвета карты
app.post("/start_round", (req, res) => {
    const { user_id } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ error: "user_id is required" });
    }

    const color = Math.random() < 0.5 ? "red" : "blue";
    gameSessions[user_id] = {
        color,
        timestamp: Date.now()
    };

    res.json({ 
        success: true,
        message: "Round started"
    });
});

// Проверка ответа пользователя
app.post("/check_guess", (req, res) => {
    const { user_id, guess } = req.body;

    if (!user_id || !guess) {
        return res.status(400).json({ error: "user_id and guess are required" });
    }

    const session = gameSessions[user_id];

    if (!session) {
        return res.status(400).json({ error: "No active round for this user" });
    }

    const isCorrect = guess === session.color;
    const correctColor = session.color;
    delete gameSessions[user_id];

    // Обновление статистики в базе данных
    db.get("SELECT correct, wrong FROM usersScores WHERE user_id = ?", [user_id], (err, row) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Database error" });
        }

        if (row) {
            // Обновляем существующую запись
            db.run(
                "UPDATE usersScores SET correct = ?, wrong = ? WHERE user_id = ?",
                [
                    row.correct + (isCorrect ? 1 : 0),
                    row.wrong + (isCorrect ? 0 : 1),
                    user_id
                ],
                (err) => {
                    if (err) {
                        console.error("Error updating score:", err);
                    }
                }
            );
        } else {
            // Создаем новую запись
            db.run(
                "INSERT INTO usersScores (user_id, username, correct, wrong) VALUES (?, ?, ?, ?)",
                [
                    user_id,
                    "Игрок",
                    isCorrect ? 1 : 0,
                    isCorrect ? 0 : 1
                ],
                (err) => {
                    if (err) {
                        console.error("Error inserting score:", err);
                    }
                }
            );
        }
    });

    res.json({ 
        correct: isCorrect, 
        color: correctColor 
    });
});

// Сохранение результата
app.post("/save_score", (req, res) => {
    const { user_id, username, correct, wrong } = req.body;

    if (!user_id || correct === undefined || wrong === undefined) {
        return res.status(400).json({ error: "user_id, correct, and wrong are required" });
    }

    db.run(
        "INSERT OR REPLACE INTO usersScores (user_id, username, correct, wrong) VALUES (?, ?, ?, ?)",
        [user_id, username || "Игрок", correct, wrong],
        (err) => {
            if (err) {
                console.error("Error saving score:", err);
                return res.status(500).json({ error: "Database error" });
            }
            res.json({ success: true });
        }
    );
});

// Получение статистики игрока
app.get("/get_stats", (req, res) => {
    const { user_id } = req.query;
    
    if (!user_id) {
        return res.status(400).json({ error: "user_id is required" });
    }

    db.get(
        "SELECT username, correct, wrong FROM usersScores WHERE user_id = ?",
        [user_id],
        (err, row) => {
            if (err) {
                console.error("Error getting stats:", err);
                return res.status(500).json({ error: "Database error" });
            }
            
            res.json({
                username: row?.username || "Игрок",
                correct: row?.correct || 0,
                wrong: row?.wrong || 0
            });
        }
    );
});

// Получение таблицы лидеров (топ 10 по разнице correct - wrong)
app.get("/leaderboard", (req, res) => {
    db.all(`
        SELECT 
            username,
            correct,
            wrong,
            (correct - wrong) as score
        FROM usersScores 
        WHERE (correct + wrong) >= 10
        ORDER BY score DESC 
        LIMIT 10
    `, [], (err, rows) => {
        if (err) {
            console.error("Error getting leaderboard:", err);
            return res.status(500).json({ error: "Database error" });
        }
        
        res.json(rows);
    });
});

// Endpoint для обновления счёта в Telegram
app.post("/update_telegram_score", (req, res) => {
    const { user_id, correct, wrong } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ error: "user_id is required" });
    }

    // Здесь можно добавить логику обновления счёта в Telegram
    res.json({ success: true });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error("Server error:", err.stack);
    res.status(500).json({ error: "Something went wrong!" });
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Closing database connection...');
    db.close(() => {
        console.log('Database connection closed.');
        process.exit(0);
    });
});