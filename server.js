const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// Хранение сессий игроков (цвет карты)
let gameSessions = {};

// Генерация цвета карты и сохранение на сервере
app.post("/start_round", (req, res) => {
    const { user_id } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ error: "user_id is required" });
    }

    const color = Math.random() < 0.5 ? "white" : "black";
    gameSessions[user_id] = color; // Сохраняем цвет карты у пользователя

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
    delete gameSessions[user_id]; // Удаляем сессию после ответа

    res.json({ correct: isCorrect, color: correctColor });
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
