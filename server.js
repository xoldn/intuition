const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const sqlite3 = require("sqlite3").verbose();
const util = require("util");

const app = express();

// Middleware для безопасности и логирования
app.use(helmet());
app.use(morgan("combined"));
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// Подключение к базе данных SQLite
const db = new sqlite3.Database("./db.sqlite", (err) => {
  if (err) {
    console.error("Ошибка при подключении к базе:", err.message);
    process.exit(1);
  } else {
    console.log("Подключение к базе SQLite успешно");
  }
});

// Промисификация некоторых функций для удобства
const dbRun = util.promisify(db.run.bind(db));
const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));

// Создаем таблицу, если её ещё нет
db.run(`CREATE TABLE IF NOT EXISTS usersScores (
  user_id TEXT PRIMARY KEY,
  username TEXT,
  correct INTEGER DEFAULT 0,
  wrong INTEGER DEFAULT 0
)`);

// Хранение активных игровых сессий
let gameSessions = {};

// Очистка старых сессий каждые 5 минут
setInterval(() => {
  const now = Date.now();
  Object.keys(gameSessions).forEach((userId) => {
    if (now - gameSessions[userId].timestamp > 5 * 60 * 1000) {
      delete gameSessions[userId];
    }
  });
}, 5 * 60 * 1000);

// Endpoint для начала раунда
app.post("/start_round", (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" });
  }
  const color = Math.random() < 0.5 ? "white" : "black";
  gameSessions[user_id] = { color, timestamp: Date.now() };
  res.json({ success: true, message: "Round started" });
});

// Endpoint для проверки ответа пользователя
app.post("/check_guess", async (req, res) => {
  try {
    const { user_id, username, guess } = req.body;
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
    const row = await dbGet("SELECT correct, wrong FROM usersScores WHERE user_id = ?", [user_id]);
    if (row) {
      await dbRun(
        "UPDATE usersScores SET correct = ?, wrong = ? WHERE user_id = ?",
        [row.correct + (isCorrect ? 1 : 0), row.wrong + (isCorrect ? 0 : 1), user_id]
      );
    } else {
      await dbRun(
        "INSERT INTO usersScores (user_id, username, correct, wrong) VALUES (?, ?, ?, ?)",
        [user_id, username || "Игрок", isCorrect ? 1 : 0, isCorrect ? 0 : 1]
      );
    }

    res.json({ correct: isCorrect, color: correctColor });
  } catch (error) {
    console.error("Ошибка в /check_guess:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Endpoint для получения статистики игрока
app.get("/get_stats", async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }
    const row = await dbGet("SELECT username, correct, wrong FROM usersScores WHERE user_id = ?", [user_id]);
    res.json({
      username: row?.username || "Игрок",
      correct: row?.correct || 0,
      wrong: row?.wrong || 0,
    });
  } catch (error) {
    console.error("Ошибка в /get_stats:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Endpoint для получения таблицы лидеров
app.get("/leaderboard", async (req, res) => {
  try {
    const rows = await dbAll(`
      SELECT username, correct, wrong, (correct - wrong) as score
      FROM usersScores 
      WHERE (correct + wrong) >= 200
      ORDER BY score DESC 
      LIMIT 100
    `, []);
    res.json(rows);
  } catch (error) {
    console.error("Ошибка в /leaderboard:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Пример заглушки для обновления счёта в Telegram
app.post("/update_telegram_score", (req, res) => {
  res.json({ success: true });
});

// Middleware для обработки ошибок
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown (обработка SIGTERM и SIGINT)
const shutdown = () => {
  console.log("Closing database connection...");
  db.close(() => {
    console.log("Database connection closed.");
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);