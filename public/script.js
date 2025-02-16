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

// Получение списка лучших игроков
async function getLeaderboard() {
    try {
        let response = await fetch("/leaderboard");
        let data = await response.json();

        let leaderboardText = "🏆 **Топ игроков:**\n";
        data.forEach((player, index) => {
            leaderboardText += `${index + 1}. ${player.username}: ${player.score} очков\n`;
        });

        alert(leaderboardText);
    } catch (error) {
        console.error("Ошибка при получении топ-игроков:", error);
    }
}

// Добавляем кнопку просмотра результатов
const leaderboardBtn = document.createElement("button");
leaderboardBtn.textContent = "📊 Топ игроков";
leaderboardBtn.style = "margin-top: 20px; padding: 10px; font-size: 1rem;";
leaderboardBtn.onclick = getLeaderboard;
document.body.appendChild(leaderboardBtn);

// Запуск первого раунда
startNewRound();
