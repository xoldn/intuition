const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// Хранение очков пользователей
let usersScores = {}; // { user_id: { username, score } }
let gameSessions = {}; // { user_id: color }

// Генерация цвета карты и сохранение на сервере
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

    res.json({ correct: isCorrect, color: correctColor });
});

// Сохранение результата
app.post("/save_score", (req, res) => {
    const { user_id, username, score } = req.body;

    if (!user_id || !username || score === undefined) {
        return res.status(400).json({ error: "Invalid data" });
    }

    usersScores[user_id] = { username, score };
    console.log("Сохранён результат:", usersScores);
    res.json({ status: "ok", message: "Score saved!" });
});

// Получение всех результатов
app.get("/get_scores", (req, res) => {
    res.json(usersScores);
});

// Получение топ-5 игроков
app.get("/leaderboard", (req, res) => {
    let sortedUsers = Object.values(usersScores)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    
    res.json(sortedUsers);
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
