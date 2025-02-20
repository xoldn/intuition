const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

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
    // Add polling error handler
    polling_error_handler: (error) => {
        console.error('Polling error:', error);
    }
});

console.log("Bot started successfully!");

// Handle game callback queries with proper error handling
bot.on("callback_query", async (query) => {
    try {
        // Validate the callback query
        if (!query || !query.game_short_name) {
            throw new Error("Invalid callback query");
        }

        // Verify game short name
        if (query.game_short_name === GAME_SHORT_NAME) {
            const userId = query.from.id;
            // Use encodeURIComponent to properly escape URL parameters
            const username = encodeURIComponent(query.from.username || "Player");
            const chatId = query.message?.chat?.id;
            const messageId = query.message?.message_id;

            // Validate required parameters
            if (!userId || !chatId || !messageId) {
                throw new Error("Missing required parameters");
            }

            // Construct game URL with validated parameters
            const gameUrlWithParams = new URL(GAME_URL);
            gameUrlWithParams.searchParams.append("user_id", userId);
            gameUrlWithParams.searchParams.append("username", username);
            gameUrlWithParams.searchParams.append("chat_id", chatId);
            gameUrlWithParams.searchParams.append("message_id", messageId);

            // Answer callback query with the game URL
            await bot.answerCallbackQuery(query.id, {
                url: gameUrlWithParams.toString()
            });
        }
    } catch (error) {
        console.error('Error handling callback query:', error);
        
        // Attempt to notify user of error
        try {
            await bot.answerCallbackQuery(query.id, {
                text: "Sorry, an error occurred while loading the game.",
                show_alert: true
            });
        } catch (notificationError) {
            console.error('Error sending error notification:', notificationError);
        }
    }
});

// Add error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Add error handler for unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});