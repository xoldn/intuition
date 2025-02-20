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
        
        const data = await response.json();
        currentColor = data.color; // Сохраняем цвет
        
        // Показываем цвет на 300мс
        card.style.backgroundColor = currentColor;
        card.textContent = "";

        // Через 300мс скрываем цвет
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Возвращаем знак вопроса
        card.style.backgroundColor = "#777";
        card.textContent = "?";
        
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

        // Обновляем счёт до показа результата
        if (data.correct) {
            correctCount++;
            card.style.boxShadow = "inset 0 0 0 5px limegreen";
        } else {
            wrongCount++;
            card.style.boxShadow = "inset 0 0 0 5px red";
        }

        updateScore();
        await sendResultToServer();
        
        // Небольшая пауза перед следующим раундом
        await new Promise(resolve => setTimeout(resolve, 500));
        
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

// Отправка результата на сервер
async function sendResultToServer() {
    try {
        await fetch("/save_score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                user_id: userId,
                username: username,
                correct: correctCount,
                wrong: wrongCount
            })
        });
    } catch (error) {
        console.error("Ошибка при отправке результата:", error);
    }
}

// Добавляем обработчики событий для кнопок
document.getElementById("guessWhite")?.addEventListener("click", () => makeGuess("white"));
document.getElementById("guessBlack")?.addEventListener("click", () => makeGuess("black"));

// Запуск игры
startNewRound();