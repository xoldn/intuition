let urlParams = new URLSearchParams(window.location.search);
let userId = urlParams.get("user_id");
let username = urlParams.get("username") || "Игрок";
let chatId = urlParams.get("chat_id");
let messageId = urlParams.get("message_id");
let inlineMessageId = urlParams.get("inline_message_id");

if (!userId || (!inlineMessageId && (!chatId || !messageId))) {
    alert("Ошибка: не удалось получить данные пользователя.");
    throw new Error("Missing user data");
}

let correctCount = 0;
let wrongCount = 0;
let isProcessing = false;
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
    if (isProcessing) return;
    
    isProcessing = true;
    currentColor = null;

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
    if (isProcessing || !currentColor) return;
    
    isProcessing = true;
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
        
        // Показываем цвет на 300мс
        card.style.backgroundColor = currentColor;
        card.textContent = "";

        // Через 300мс скрываем цвет
        await new Promise(resolve => setTimeout(resolve, 300));

        // Обновляем счёт до показа результата
        if (data.correct) {
            correctCount++;
            card.style.boxShadow = "inset 0 0 0 5px limegreen";
        } else {
            wrongCount++;
            card.style.boxShadow = "inset 0 0 0 5px red";
        }

        updateScore();
        
    } catch (error) {
        console.error("Ошибка при проверке ответа:", error);
        card.textContent = "⚠️";
    } finally {
        isProcessing = false;
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

        users.forEach(user => {
            const userElement = document.createElement("div");
            userElement.textContent = `${user.username}: ${user.score}`;
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

    // Запускаем новый раунд
    startNewRound();
}

// Добавляем обработчики событий для кнопок
document.getElementById("guessWhite")?.addEventListener("click", () => makeGuess("white"));
document.getElementById("guessBlack")?.addEventListener("click", () => makeGuess("black"));

// Запуск игры
startNewRound();