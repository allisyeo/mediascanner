"use strict";
const { Router } = require("express");
const router = Router();

// POST /api/telegram/send-notification
// Отправляет уведомление сотруднику через Telegram.
//
// TODO (production):
//   1. Подключить Telegram Bot API: npm install node-telegram-bot-api
//   2. Использовать токен из process.env.TELEGRAM_BOT_TOKEN — НЕ хранить во frontend
//   3. Пример отправки:
//      const TelegramBot = require("node-telegram-bot-api");
//      const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
//      await bot.sendMessage(payload.telegramChatId, payload.messageText);
//   4. Хранить telegramChatId сотрудника в таблице employees (PostgreSQL)
//   5. Логировать результат в таблицу notification_log

router.post("/send-notification", (req, res) => {
  const {
    recipientId,
    telegramChatId,
    mentionId,
    messageText,
    priority,
    source,
    keyword
  } = req.body;

  if (!messageText) {
    return res.status(400).json({
      success: false,
      message: "Поле messageText обязательно"
    });
  }

  // DEMO: реальная отправка не выполняется
  // В production здесь будет вызов Telegram Bot API
  console.log("[Telegram DEMO] Уведомление:", {
    recipientId,
    telegramChatId,
    mentionId,
    messageText,
    priority,
    source,
    keyword,
    simulatedAt: new Date().toISOString()
  });

  res.json({
    success: true,
    mode: "demo",
    message: "Telegram notification simulated",
    payload: {
      recipientId: recipientId || null,
      telegramChatId: telegramChatId || null,
      mentionId: mentionId || null,
      messageText,
      priority: priority || "medium",
      source: source || null,
      keyword: keyword || null,
      simulatedAt: new Date().toISOString()
    }
  });
});

// GET /api/telegram/status
// Проверка статуса бота.
// TODO: в production — проверять getMe() через Bot API
router.get("/status", (req, res) => {
  const hasBotToken = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  res.json({
    success: true,
    mode: "demo",
    botConnected: false, // TODO: заменить на реальную проверку getMe()
    tokenConfigured: hasBotToken,
    message: hasBotToken
      ? "Токен настроен — подключите Bot API для активации"
      : "TELEGRAM_BOT_TOKEN не задан в .env"
  });
});

module.exports = router;
