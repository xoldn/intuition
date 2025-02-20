// URL Parameters handling
let urlParams = new URLSearchParams(window.location.search);
let userId = urlParams.get("user_id");
let username = urlParams.get("username") || "Игрок";
let chatId = urlParams.get("chat_id");
let messageId = urlParams.get("message_id");
let inlineMessageId = urlParams.get("inline_message_id");

// Modified validation to handle both inline and regular game modes
if (!userId || (!inlineMessageId && (!chatId || !messageId))) {
    alert("Ошибка: не удалось получить данные пользователя.");
    throw new Error("Missing user data");
}

let correctCount = 0;
let wrongCount = 0;
let isRoundActive = false; // Add state tracking

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
    if (isRoundActive) {
        console.log("Раунд уже активен");
        return;
    }

    try {
        isRoundActive = true;
        
        // Визуальное обновление карты
        updateCardAppearance("?", "#777", "none");

        const response = await fetch("/start_round", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-cache"  // Предотвращаем кэширование
            },
            body: JSON.stringify({ 
                user_id: userId,
                username: username,
                chat_id: chatId,
                message_id: messageId,
                inline_message_id: inlineMessageId
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Новый раунд начат:", data);
        
    } catch (error) {
        console.error("Ошибка при старте раунда:", error);
        updateCardAppearance("⚠️", "#ff6b6b", "none");
    } finally {
        isRoundActive = false;
    }
}

// Обновление внешнего вида карты
function updateCardAppearance(text, backgroundColor, boxShadow) {
    requestAnimationFrame(() => {
        card.textContent = text;
        card.style.backgroundColor = backgroundColor;
        card.style.boxShadow = boxShadow;
        card.style.transition = "all 0.3s ease";
    });
}

// Проверка ответа
async function makeGuess(guess) {
    if (isRoundActive) {
        console.log("Подождите, предыдущий раунд ещё активен");
        return;
    }

    try {
        isRoundActive = true;
        
        // Визуальная индикация обработки
        updateCardAppearance("⌛", "#777", "none");

        const response = await fetch("/check_guess", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-cache"
            },
            body: JSON.stringify({ 
                user_id: userId,
                username: username,
                guess: guess,
                chat_id: chatId,
                message_id: messageId,
                inline_message_id: inlineMessageId
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Обновление визуального состояния
        updateCardAppearance("", data.color, 
            data.correct ? "inset 0 0 0 5px limegreen" : "inset 0 0 0 5px red");

        // Обновление счёта
        if (data.correct) {
            correctCount++;
        } else {
            wrongCount++;
        }

        updateScore();
        await Promise.all([
            sendResultToServer(),
            sendScoreToTelegram()
        ]);

    } catch (error) {
        console.error("Ошибка при проверке ответа:", error);
        updateCardAppearance("⚠️", "#ff6b6b", "none");
    } finally {
        isRoundActive = false;
        // Небольшая задержка перед следующим раундом
        setTimeout(() => startNewRound(), 800);
    }
}

// Обновление счета
function updateScore() {
    requestAnimationFrame(() => {
        correctScoreEl.textContent = `✅ ${correctCount}`;
        wrongScoreEl.textContent = `❌ ${wrongCount}`;
    });
}

// Отправка результата на сервер
async function sendResultToServer() {
    try {
        const response = await fetch("/save_score", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-cache"
            },
            body: JSON.stringify({ 
                user_id: userId, 
                username: username, 
                score: correctCount,
                chat_id: chatId,
                message_id: messageId,
                inline_message_id: inlineMessageId
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Результат сохранен:", data);

    } catch (error) {
        console.error("Ошибка при отправке результата:", error);
    }
}

// Отправка счета в Telegram
async function sendScoreToTelegram() {
    try {
        const response = await fetch("/update_telegram_score", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-cache"
            },
            body: JSON.stringify({ 
                user_id: userId,
                username: username,
                score: correctCount,
                chat_id: chatId,
                message_id: messageId,
                inline_message_id: inlineMessageId
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error("Ошибка при отправке счета в Telegram:", error);
    }
}

// Обработчики событий для кнопок
document.getElementById("guessRed")?.addEventListener("click", () => makeGuess("red"));
document.getElementById("guessBlue")?.addEventListener("click", () => makeGuess("blue"));

// Запуск первого раунда
window.addEventListener("load", () => {
    console.log("Игра загружена, начинаем первый раунд");
    startNewRound();
});