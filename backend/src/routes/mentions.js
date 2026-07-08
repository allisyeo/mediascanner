"use strict";
const { Router } = require("express");
const router = Router();
const store = require("../data/mentionsStore");

// GET /api/mentions
router.get("/", (req, res) => {
  const { source, sentiment, status, keyword, assignedTo } = req.query;
  let result = store.getAll();

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

  res.json({ success: true, total: result.length, data: result });
});

// GET /api/mentions/:id
router.get("/:id", (req, res) => {
  const mention = store.getAll().find(m => m.id === req.params.id);
  if (!mention) return res.status(404).json({ success: false, message: "Упоминание не найдено" });
  res.json({ success: true, data: mention });
});

// POST /api/mentions — добавить вручную или из парсера
router.post("/", (req, res) => {
  const { source, author, text, sentiment, keyword, status, assignedTo, priority } = req.body;
  if (!source || !text) {
    return res.status(400).json({ success: false, message: "Поля source и text обязательны" });
  }
  const newMention = {
    id: "m_" + Date.now(),
    source, author: author || "@unknown", text,
    sentiment: sentiment || "neutral",
    importance: priority === "high" ? "high" : priority === "low" ? "low" : "medium",
    keyword: keyword || "",
    status: status || "Новый",
    assignedTo: assignedTo || null,
    priority: priority || "medium",
    slaStatus: "good", slaMinutes: 60,
    instagramSourceType: null, instagramCommentId: null,
    replyHistory: [], createdAt: new Date().toISOString()
  };
  store.addMany([newMention]);
  res.status(201).json({ success: true, message: "Упоминание добавлено", data: newMention });
});

// PATCH /api/mentions/:id/status
router.patch("/:id/status", (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ success: false, message: "Поле status обязательно" });
  const updated = store.update(req.params.id, { status, updatedAt: new Date().toISOString() });
  if (!updated) return res.status(404).json({ success: false, message: "Упоминание не найдено" });
  res.json({ success: true, data: updated });
});

// POST /api/mentions/:id/reply
router.post("/:id/reply", (req, res) => {
  const mention = store.getAll().find(m => m.id === req.params.id);
  if (!mention) return res.status(404).json({ success: false, message: "Упоминание не найдено" });
  const { author, text } = req.body;
  if (!text) return res.status(400).json({ success: false, message: "Поле text обязательно" });
  const entry = { author: author || "Оператор", date: new Date().toLocaleString("ru-RU"), text, status: "sent" };
  const replyHistory = [...(mention.replyHistory || []), entry];
  store.update(mention.id, { replyHistory, status: "Ответ отправлен", updatedAt: new Date().toISOString() });
  res.json({ success: true, message: "Ответ сохранён", data: entry });
});

// DELETE /api/mentions — очистить все
router.delete("/", (req, res) => {
  store.clear();
  res.json({ success: true, message: "Все упоминания удалены" });
});

// GET /api/mentions/snapshot — экспорт всех упоминаний как JSON-файл (для коммита в git)
router.get("/snapshot", (req, res) => {
  const data = store.exportBundle();
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", "attachment; filename=\"mentions.json\"");
  res.send(JSON.stringify(data, null, 2));
});

module.exports = router;
