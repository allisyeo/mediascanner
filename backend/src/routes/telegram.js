"use strict";
const { Router } = require("express");
const router = Router();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" })
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || "Telegram API error");
  return data.result;
}

function buildMessage({ messageText, mentionId, priority, source, keyword }) {
  const priorityLabel = { high: "🔴 Высокий", medium: "🟡 Средний", low: "🟢 Низкий" }[priority] || "🟡 Средний";
  let text = `<b>📢 KT MediaScanner — новое упоминание</b>\n\n`;
  if (source)    text += `<b>Источник:</b> ${source}\n`;
  if (keyword)   text += `<b>Ключевое слово:</b> ${keyword}\n`;
  text += `<b>Приоритет:</b> ${priorityLabel}\n`;
  if (mentionId) text += `<b>ID упоминания:</b> ${mentionId}\n`;
  text += `\n${messageText}`;
  return text;
}

// POST /api/telegram/send-notification
router.post("/send-notification", async (req, res) => {
  const { recipientId, telegramChatId, mentionId, messageText, priority, source, keyword } = req.body;

  if (!messageText) {
    return res.status(400).json({ success: false, message: "Поле messageText обязательно" });
  }

  const chatId = telegramChatId || process.env.TELEGRAM_DEFAULT_CHAT_ID;

  if (!chatId) {
    return res.status(400).json({ success: false, message: "Не передан telegramChatId и не задан TELEGRAM_DEFAULT_CHAT_ID" });
  }

  if (!BOT_TOKEN) {
    console.log("[Telegram DEMO] Уведомление (токен не задан):", { chatId, messageText });
    return res.json({
      success: true, mode: "demo",
      message: "Telegram notification simulated — задайте TELEGRAM_BOT_TOKEN в .env"
    });
  }

  try {
    const text = buildMessage({ messageText, mentionId, priority, source, keyword });
    const result = await sendTelegramMessage(chatId, text);
    console.log(`[Telegram] Сообщение отправлено в chat ${chatId}, message_id=${result.message_id}`);
    res.json({ success: true, mode: "production", messageId: result.message_id, chatId });
  } catch (err) {
    console.error("[Telegram] Ошибка отправки:", err.message);
    res.status(502).json({ success: false, message: "Ошибка Telegram API: " + err.message });
  }
});

// GET /api/telegram/status
router.get("/status", async (req, res) => {
  if (!BOT_TOKEN) {
    return res.json({ success: true, mode: "demo", botConnected: false, tokenConfigured: false,
      message: "TELEGRAM_BOT_TOKEN не задан в .env" });
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const data = await r.json();
    res.json({
      success: true, mode: "production", botConnected: data.ok,
      tokenConfigured: true,
      botName: data.ok ? data.result.first_name : null,
      botUsername: data.ok ? data.result.username : null,
      message: data.ok ? `Бот @${data.result.username} подключён` : "Ошибка: " + data.description
    });
  } catch (err) {
    res.status(502).json({ success: false, message: "Не удалось подключиться к Telegram API: " + err.message });
  }
});

module.exports = router;
