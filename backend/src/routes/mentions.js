"use strict";
const { Router } = require("express");
const router = Router();
const { mentions } = require("../data/demoData");

// В-памяти хранилище для demo-режима.
// TODO: заменить на запросы к PostgreSQL (см. DATABASE_URL в .env)
let demоMentions = [...mentions];

// GET /api/mentions
// Возвращает список упоминаний. Поддерживает фильтры через query-параметры:
//   ?source=Instagram&sentiment=negative&status=Новый&keyword=интернет
router.get("/", (req, res) => {
  const { source, sentiment, status, keyword, assignedTo } = req.query;
  let result = [...demоMentions];

  if (source)     result = result.filter(m => m.source === source);
  if (sentiment)  result = result.filter(m => m.sentiment === sentiment);
  if (status)     result = result.filter(m => m.status === status);
  if (assignedTo) result = result.filter(m => m.assignedTo === assignedTo);
  if (keyword) {
    const needle = keyword.toLowerCase();
    result = result.filter(m =>
      (m.keyword || "").toLowerCase().includes(needle) ||
      m.text.toLowerCase().includes(needle)
    );
  }

  res.json({
    success: true,
    mode: "demo",
    total: result.length,
    data: result
  });
});

// GET /api/mentions/:id
// Возвращает одно упоминание по id.
router.get("/:id", (req, res) => {
  const mention = demоMentions.find(m => m.id === req.params.id);
  if (!mention) {
    return res.status(404).json({ success: false, message: "Упоминание не найдено" });
  }
  res.json({ success: true, data: mention });
});

// POST /api/mentions
// Принимает новое упоминание (например, пришедшее от парсера/вебхука).
// TODO: сохранять в PostgreSQL вместо массива в памяти
router.post("/", (req, res) => {
  const {
    source, author, text, sentiment,
    keyword, status, assignedTo, priority,
    slaStatus, instagramSourceType, instagramCommentId
  } = req.body;

  if (!source || !text) {
    return res.status(400).json({
      success: false,
      message: "Поля source и text обязательны"
    });
  }

  const newMention = {
    id: "m_" + Date.now(),
    source: source || "Telegram",
    author: author || "@unknown",
    text,
    sentiment: sentiment || "neutral",
    importance: priority === "high" ? "high" : priority === "low" ? "low" : "medium",
    keyword: keyword || "",
    status: status || "Новый",
    assignedTo: assignedTo || null,
    priority: priority || "medium",
    slaStatus: slaStatus || "good",
    slaMinutes: 60,
    instagramSourceType: instagramSourceType || null,
    instagramCommentId: instagramCommentId || null,
    replyHistory: [],
    createdAt: new Date().toISOString()
  };

  demоMentions.unshift(newMention);

  res.status(201).json({
    success: true,
    mode: "demo",
    message: "Упоминание добавлено",
    data: newMention
  });
});

// PATCH /api/mentions/:id/status
// Обновляет статус упоминания.
// TODO: обновлять запись в PostgreSQL
router.patch("/:id/status", (req, res) => {
  const mention = demоMentions.find(m => m.id === req.params.id);
  if (!mention) {
    return res.status(404).json({ success: false, message: "Упоминание не найдено" });
  }
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, message: "Поле status обязательно" });
  }
  mention.status = status;
  mention.updatedAt = new Date().toISOString();
  res.json({ success: true, mode: "demo", data: mention });
});

// POST /api/mentions/:id/reply
// Сохраняет ответ оператора в историю упоминания.
// Для Instagram — вызывает /api/instagram/reply (через frontend или напрямую).
// TODO: сохранять в таблицу reply_history в PostgreSQL
router.post("/:id/reply", (req, res) => {
  const mention = demоMentions.find(m => m.id === req.params.id);
  if (!mention) {
    return res.status(404).json({ success: false, message: "Упоминание не найдено" });
  }
  const { author, text } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, message: "Поле text обязательно" });
  }

  const historyEntry = {
    author: author || "Оператор",
    date: new Date().toLocaleString("ru-RU"),
    text,
    status: "demo_sent"
  };

  if (!mention.replyHistory) mention.replyHistory = [];
  mention.replyHistory.push(historyEntry);
  mention.status = "Ответ отправлен";
  mention.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    mode: "demo",
    message: "Ответ сохранён",
    data: historyEntry
  });
});

module.exports = router;
