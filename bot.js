const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('BOT_TOKEN is not set in environment variables');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Handle polling errors
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name;

    if (msg.text === '/start') {
        const gameUrl = `https://your-domain.com/game.html?user_id=${userId}&chat_id=${chatId}&username=${username}`;
        await bot.sendMessage(chatId, 'Добро пожаловать в игру Интуиция! Нажмите кнопку ниже, чтобы начать:', {
            reply_markup: {
                inline_keyboard: [[
                    { text: '🎮 Играть', url: gameUrl }
                ]]
            }
        });
    }
});

// Handle callback queries
bot.on('callback_query', (query) => {
    bot.answerCallbackQuery(query.id);
});

process.on('SIGINT', () => {
    bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', () => {
    bot.stopPolling();
    process.exit(0);
});
