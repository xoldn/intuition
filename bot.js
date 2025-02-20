const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
require("dotenv").config();

// Environment variables validation
const TOKEN = process.env.BOT_TOKEN;
const GAME_URL = process.env.GAME_URL;
const GAME_SHORT_NAME = process.env.GAME_SHORT_NAME;

// Validate required environment variables
if (!TOKEN || !GAME_URL || !GAME_SHORT_NAME) {
    console.error("Error: Missing required environment variables");
    process.exit(1);
}

// Initialize bot with error handling
const bot = new TelegramBot(TOKEN, { 
    polling: true,
    polling_error_handler: (error) => {
        console.error('Polling error:', error);
    }
});

console.log("Bot started successfully!");

// Handle game callback queries with support for both inline and regular messages
bot.on("callback_query", async (query) => {
    try {

        // Validate the callback query
        if (!query || !query.game_short_name) {
            console.error('Invalid callback query structure:', query);
            throw new Error("Invalid callback query");
        }

        // Verify game short name
        if (query.game_short_name === GAME_SHORT_NAME) {
            // Extract and validate all required parameters
            const params = {
                userId: query.from?.id,
                username: query.from?.username || "Player",
                // Handle both inline and regular message cases
                inlineMessageId: query.inline_message_id,
                chatId: query.message?.chat?.id,
                messageId: query.message?.message_id
            };

            // Create URL parameters based on what's available
            const gameUrlWithParams = new URL(GAME_URL);
            
            // Add required parameters
            gameUrlWithParams.searchParams.append("user_id", params.userId);
            gameUrlWithParams.searchParams.append("username", encodeURIComponent(params.username));

            // Add either inline_message_id or chat_id + message_id
            if (params.inlineMessageId) {
                gameUrlWithParams.searchParams.append("inline_message_id", params.inlineMessageId);
            } else if (params.chatId && params.messageId) {
                gameUrlWithParams.searchParams.append("chat_id", params.chatId);
                gameUrlWithParams.searchParams.append("message_id", params.messageId);
            }

            // Answer callback query with the game URL
            await bot.answerCallbackQuery(query.id, {
                url: gameUrlWithParams.toString()
            });
        } else {
            console.log('Game short name mismatch:', {
                received: query.game_short_name,
                expected: GAME_SHORT_NAME
            });
        }
    } catch (error) {
        const errorTime = new Date().toISOString();
        console.error(`Error at ${errorTime} handling callback query:`, error);
        console.error('Query object at time of error:', JSON.stringify(query, null, 2));
        
        // Attempt to notify user of error
        try {
            await bot.answerCallbackQuery(query.id, {
                text: "Game is loading...",
                show_alert: false
            });
        } catch (notificationError) {
            console.error('Error sending error notification:', notificationError);
        }
    }
});

// Handler for the /start command to send the game
bot.onText(/\/start/, async (msg) => {
    try {
        const chatId = msg.chat.id; // Получаем chatId из msg
        const sentMessage = await bot.sendGame(chatId, GAME_SHORT_NAME);
        sendLeaderboard(chatId, sentMessage.message_id);
    } catch (error) {
        console.error('Error sending game:', error);
    }
});

// Handler to send game inline
bot.on('inline_query', async (query) => {
    try {
        await bot.answerInlineQuery(query.id, [{
            type: 'game',
            id: '1',
            game_short_name: GAME_SHORT_NAME
        }]);
    } catch (error) {
        console.error('Error answering inline query:', error);
    }
});

// Функция для отправки таблицы лидеров
function sendLeaderboard(chatId, messageId) {
    // Запрос к вашему серверу для получения таблицы лидеров
    axios.get('http://localhost:10000/leaderboard')
      .then((response) => {
        const leaderboard = response.data;
  
        if (leaderboard.length === 0) {
          bot.sendMessage(chatId, 'Таблица лидеров пуста.');
          return;
        }
        
        // Формирование сообщения с таблицей лидеров
        let message = '🏆 *Таблица лидеров:*\n\n';
        leaderboard.forEach((user, index) => {
            const totalGuesses = user.correct + user.wrong;
            const accuracy = totalGuesses > 0 ? ((user.correct / totalGuesses) * 100).toFixed(2) : 0;
          message += `${user.username}: (${user.correct} ✅, ${user.wrong} ❌, ${accuracy}% 🎯)\n\n`;
        });
  
        // Обновление сообщения с игрой, добавляя таблицу лидеров
        bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Заниматься снова!',
                  callback_game: {}, // Кнопка для повторного запуска игры
                },
              ],
            ],
          },
        }).catch((error) => {
          console.error('Ошибка при обновлении сообщения с таблицей лидеров:', error);
        });
      })
      .catch((error) => {
        console.error('Ошибка при получении таблицы лидеров:', error);
        bot.sendMessage(chatId, 'Произошла ошибка при получении таблицы лидеров. Пожалуйста, попробуйте позже.');
      });
  }

// Add error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Add error handler for unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

console.log(`Bot initialized at: ${new Date().toISOString()}`);