const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();

// Middleware для разбора JSON
app.use(bodyParser.json());

// Статическая папка для клиентской части (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Подключение к базе SQLite (файл базы: game.db)
const db = new sqlite3.Database('./game.db', (err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных', err);
  } else {
    console.log('Подключено к базе SQLite');
  }
});

// Создаем таблицу для хранения результатов, если её ещё нет
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guess TEXT,
    actual TEXT,
    correct INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// API-эндпоинт для обработки догадок
app.post('/guess', (req, res) => {
  const userGuess = req.body.guess;

  if (userGuess !== 'white' && userGuess !== 'black') {
    return res.status(400).json({ error: 'Некорректная догадка' });
  }
  
  // Генерация случайного цвета
  const actualColor = Math.random() < 0.5 ? 'white' : 'black';
  const correct = userGuess === actualColor ? 1 : 0;
  
  // Сохранение результата в базе данных
  db.run(
    `INSERT INTO results (guess, actual, correct) VALUES (?, ?, ?)`,
    [userGuess, actualColor, correct],
    function(err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Ошибка базы данных' });
      }
      
      res.json({
        actual: actualColor,
        correct: !!correct,
        id: this.lastID
      });
    }
  );
});

// API-эндпоинт для получения текущего счёта игры
app.get('/score', (req, res) => {
  db.all(
    `SELECT correct, COUNT(*) AS count FROM results GROUP BY correct`,
    (err, rows) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Ошибка базы данных' });
      }
      
      let correctCount = 0, wrongCount = 0;
      rows.forEach(row => {
        if (row.correct === 1) {
          correctCount = row.count;
        } else {
          wrongCount = row.count;
        }
      });
      
      res.json({ correct: correctCount, wrong: wrongCount });
    }
  );
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});