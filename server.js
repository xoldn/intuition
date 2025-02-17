const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// Хранение статистики игроков
let usersScores = {}; // { user_id: { username, correct: 0, wrong: 0 } }
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

// Проверка ответа пользователя
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

    // Обновляем статистику
    if (!usersScores[user_id]) {
        usersScores[user_id] = { username: "Игрок", correct: 0, wrong: 0 };
    }

    if (isCorrect) {
        usersScores[user_id].correct += 1;
    } else {
        usersScores[user_id].wrong += 1;
    }

    res.json({ correct: isCorrect, color: correctColor });
});

// Получение статистики игрока
app.get("/get_stats", (req, res) => {
    const { user_id } = req.query;
    
    if (!usersScores[user_id]) {
        return res.json({ correct: 0, wrong: 0 });
    }

    res.json(usersScores[user_id]);
});

// Получение списка лучших игроков (по разнице верных-неверных)
app.get("/leaderboard", (req, res) => {
    let sortedUsers = Object.entries(usersScores)
        .sort(([, a], [, b]) => (b.correct - b.wrong) - (a.correct - a.wrong))
        .slice(0, 5)
        .map(([id, data]) => ({ user_id: id, ...data }));

    res.json(sortedUsers);
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
