let urlParams = new URLSearchParams(window.location.search);
let userId = urlParams.get("user_id");
let username = urlParams.get("username") || "Игрок";

if (!userId) {
    alert("Ошибка: не удалось получить user_id.");
    throw new Error("user_id not found");
}

let correctCount = 0;
let wrongCount = 0;

// Элементы интерфейса
const card = document.getElementById("card");
const correctScoreEl = document.getElementById("correctScore");
const wrongScoreEl = document.getElementById("wrongScore");
const leaderboardDiv = document.createElement("div");
leaderboardDiv.id = "leaderboard";
document.body.appendChild(leaderboardDiv);

// Запуск нового раунда
async function startNewRound() {
    card.style.backgroundColor = "#777";
    card.textContent = "?";
    card.style.boxShadow = "none";

    try {
        await fetch("/start_round", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId })
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
            body: JSON.stringify({ user_id: userId, guess: guess })
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
        updateLeaderboard();
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

// Получение и отображение рейтинга
async function updateLeaderboard() {
    try {
        let response = await fetch("/leaderboard");
        let data = await response.json();

        let leaderboardText = `<h2>🏆 Топ игроков:</h2><ul>`;
        data.forEach((player, index) => {
            leaderboardText += `<li>${index + 1}. ${player.username}: ✅ ${player.correct} | ❌ ${player.wrong}</li>`;
        });
        leaderboardText += `</ul>`;

        leaderboardDiv.innerHTML = leaderboardText;
    } catch (error) {
        console.error("Ошибка при получении топ-игроков:", error);
    }
}

// Запуск первого раунда
startNewRound();
updateLeaderboard();
