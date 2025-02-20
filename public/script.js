let urlParams = new URLSearchParams(window.location.search);
let userId = Telegram.WebApp.initDataUnsafe?.user?.id;
let username = Telegram.WebApp.initDataUnsafe?.user?.username || "Игрок";
let chatId = urlParams.get("chat_id");
let messageId = urlParams.get("message_id");
let inlineMessageId = urlParams.get("inline_message_id");


if (!userId || (!inlineMessageId && (!chatId || !messageId))) {
    alert("Ошибка: не удалось получить данные пользователя.");
    throw new Error("Missing user data");
}

let correctCount = 0;
let wrongCount = 0;
let isProcessing = true;
let currentColor = null;

// Элементы интерфейса
const card = document.getElementById("card");
const resultsContent = document.getElementById("resultsContent");
const correctScoreEl = document.getElementById("correctScore");
const wrongScoreEl = document.getElementById("wrongScore");

// Проверка существования элементов
if (!card || !correctScoreEl || !wrongScoreEl) {
    console.error("Не удалось найти необходимые элементы интерфейса");
    throw new Error("Missing UI elements");
}

// Запуск нового раунда
async function startNewRound() {
    if (!isProcessing) return;

    try {
        const response = await fetch("/start_round", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId })
        });

        if (!response.ok) throw new Error("Network response was not ok");
        
    } catch (error) {
        console.error("Ошибка при старте раунда:", error);
        card.textContent = "⚠️";
    } finally {
        isProcessing = false;
    }
}

// Проверка ответа
async function makeGuess(guess) {
    if (isProcessing || currentColor) return;
    
    try {
        const response = await fetch("/check_guess", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                user_id: userId,
                guess: guess
            })
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();
        currentColor = data.color; // Сохраняем цвет
        console.log("Пользователь угадал:", data.correct);
        
        // Показываем цвет на 300мс
        card.style.backgroundColor = currentColor;
        card.textContent = "";
       

        // Обновляем счёт до показа результата
        if (data.correct) {
            correctCount++;
            card.style.boxShadow = "inset 0 0 0 5px limegreen";
        } else {
            wrongCount++;
            card.style.boxShadow = "inset 0 0 0 5px red";
        }

        // Через 300мс скрываем цвет
        await new Promise(resolve => setTimeout(resolve, 300));
        card.style.backgroundColor = "#777";
        card.textContent = "?";
        card.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.5)";

        updateScore();
        
    } catch (error) {
        console.error("Ошибка при проверке ответа:", error);
        card.textContent = "⚠️";
    } finally {
        currentColor = null;
        isProcessing = true;
        startNewRound(); // Запускаем следующий раунд
    }
}

// Обновление счета
function updateScore() {
    correctScoreEl.textContent = `✅ ${correctCount}`;
    wrongScoreEl.textContent = `❌ ${wrongCount}`;
}

// Функция отображения пользователей
async function displayUsers() {
    const modal = document.getElementById("resultsModal");
    if (modal) {
        modal.style.display = "block";
    }
    try {
        const response = await fetch("/leaderboard", {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const users = await response.json();
        resultsContent.innerHTML = ""; // Очищаем содержимое

        if (users.length === 0) {
            resultsContent.textContent = "Нет пользователей для отображения.";
            return;
        }
        users.forEach(user => {
            const userElement = document.createElement("div");
            userElement.classList.add("user-result"); // Добавляем класс к каждому элементу с пользователем
            const totalGuesses = user.correct + user.wrong;
            const accuracy = totalGuesses > 0 ? ((user.correct / totalGuesses) * 100).toFixed(2) : 0;
            const displayName = user.user_id === userId ? "я" : user.username;
            userElement.textContent = `${displayName}: (${user.correct} ✅, ${user.wrong} ❌, ${accuracy}% 🎯)`;

            if (user.user_id === userId) {
                userElement.style.fontWeight = "bold"; // Выделяем текущего пользователя
                userElement.style.color = "blue"; // Изменяем цвет текста
                userElement.style.backgroundColor = "lightyellow"; // Изменяем цвет фона
                userElement.style.border = "1px solid blue"; // Добавляем границу
                userElement.style.padding = "5px"; // Добавляем отступы
                userElement.style.borderRadius = "5px"; // Скругляем углы
            }

            resultsContent.appendChild(userElement);
        });
    } catch (error) {
        console.error("Ошибка при получении пользователей:", error);
        resultsContent.textContent = "Не удалось загрузить пользователей.";
    }
}

function shareScore() {
    if (window.Telegram && Telegram.Game && typeof Telegram.Game.shareScore === "function") {
        Telegram.Game.shareScore(correctCount);
    } else {
        console.warn("Telegram Game API shareScore не доступен");
    }
}

function closeModal() {
    const modal = document.getElementById("resultsModal");
    if (modal) {
        modal.style.display = "none";
    }
}

function restartGame() {
    // Сброс счётов
    correctCount = 0;
    wrongCount = 0;
    updateScore();
    startNewRound();
}

const addClickListener = (id, handler) => {
    document.getElementById(id)?.addEventListener("click", handler);
};

addClickListener("closeBtnX", closeModal);
addClickListener("closeBtn", closeModal);
addClickListener("viewResultsBtn", displayUsers);
addClickListener("restartBtn", restartGame);
addClickListener("guessWhite", () => makeGuess("white"));
addClickListener("guessBlack", () => makeGuess("black"));

// Запуск игры
startNewRound();