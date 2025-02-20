// public/script.js

document.addEventListener("DOMContentLoaded", () => {
    // Идентификатор пользователя сохраняется в localStorage
    let userId = localStorage.getItem("user_id") || generateUserId();
    localStorage.setItem("user_id", userId);
  
    // Получение элементов интерфейса
    const startButton = document.getElementById("start-round");
    const guessButtons = document.querySelectorAll(".guess-button");
    const messageEl = document.getElementById("message");
    const statsEl = document.getElementById("stats");
  
    // Назначение обработчиков событий
    startButton?.addEventListener("click", startRound);
    guessButtons.forEach((button) =>
      button.addEventListener("click", () => checkGuess(button.dataset.color))
    );
  
    // Обновляем статистику при загрузке страницы
    updateStats();
  
    /**
     * Генерирует уникальный user_id
     * @returns {string} - строка идентификатора
     */
    function generateUserId() {
      return "user_" + Math.random().toString(36).substr(2, 9);
    }
  
    /**
     * Устанавливает текст сообщения пользователю
     * @param {string} text - сообщение
     */
    function setMessage(text) {
      if (messageEl) messageEl.textContent = text;
    }
  
    /**
     * Запускает новый раунд игры
     */
    async function startRound() {
      try {
        setMessage("Запуск нового раунда...");
        const response = await fetch("/start_round", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });
  
        if (!response.ok) throw new Error("Ошибка при запуске раунда");
  
        setMessage("Раунд запущен! Сделайте свой выбор.");
      } catch (error) {
        console.error("startRound:", error);
        setMessage("Не удалось запустить раунд. Попробуйте снова.");
      }
    }
  
    /**
     * Отправляет предположение пользователя на сервер и получает результат
     * @param {string} guess - "white" или "black"
     */
    async function checkGuess(guess) {
      try {
        setMessage("Проверка ответа...");
        const response = await fetch("/check_guess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, guess }),
        });
  
        if (!response.ok) throw new Error("Ошибка проверки ответа");
  
        const data = await response.json();
        setMessage(data.correct ? `Верно! Это был ${data.color}.` : `Неверно! Был ${data.color}.`);
  
        updateStats();
      } catch (error) {
        console.error("checkGuess:", error);
        setMessage("Ошибка при проверке ответа.");
      }
    }
  
    /**
     * Запрашивает статистику пользователя и обновляет интерфейс
     */
    async function updateStats() {
      try {
        const response = await fetch(`/get_stats?user_id=${encodeURIComponent(userId)}`);
        if (!response.ok) throw new Error("Ошибка получения статистики");
  
        const data = await response.json();
        statsEl.textContent = `Статистика: ${data.correct} правильных, ${data.wrong} ошибок`;
      } catch (error) {
        console.error("updateStats:", error);
        statsEl.textContent = "Не удалось загрузить статистику.";
      }
    }
  });
  