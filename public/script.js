let tg = window.Telegram.WebApp;
tg.expand();

let correctCount = 0;
let wrongCount = 0;
let user = tg.initDataUnsafe.user;
if (!user) {
    alert("Ошибка: Telegram WebApp не передал данные.");
    throw new Error("No Telegram user data");
}

// Элементы интерфейса
const card = document.getElementById("card");
const correctScoreEl = document.getElementById("correctScore");
const wrongScoreEl = document.getElementById("wrongScore");

// Запуск нового раунда
async function startNewRound() {
    card.style.backgroundColor = "#777";
    card.textContent = "?";
    card.style.boxShadow = "none";

    try {
        await fetch("/start_round", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id })
        });
    } catch (error) {
        console.error("Ошибка при старте раунда:", error);
    }
}

// Проверка ответа
async function makeGuess(guess) {
    try {
        let response = await fetch("/check_guess", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, guess: guess })
        });

        let data = await response.json();

        card.style.backgroundColor = data.color;
        card.textContent = "";

        if (data.correct) {
            correctCount++;
            card.style.boxShadow = "inset 0 0 0 5px limegreen";
        } else {
            wrongCount++;
            card.style.boxShadow = "inset 0 0 0 5px red";
        }

        updateScore();
        sendResult();
        setTimeout(startNewRound, 500);
    } catch (error) {
        console.error("Ошибка при проверке ответа:", error);
    }
}

// Обновление счета
function updateScore() {
    correctScoreEl.textContent = `✅ ${correctCount}`;
    wrongScoreEl.textContent = `❌ ${wrongCount}`;
}

// Отправка результата в Telegram
async function sendResult() {
    try {
        await fetch("/save_score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, username: user.username, score: correctCount })
        });
    } catch (error) {
        console.error("Ошибка при отправке результата:", error);
    }
}

// Запуск первого раунда
startNewRound();
