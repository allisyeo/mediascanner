"use strict";
const { Router } = require("express");
const router = Router();
const { keywords: defaultKeywords } = require("../data/demoData");

// В-памяти хранилище для demo-режима.
// TODO: заменить на запросы к PostgreSQL (таблица keywords)
let demoKeywords = [...defaultKeywords];

// GET /api/keywords
// Возвращает список ключевых слов.
router.get("/", (req, res) => {
  const { status, type } = req.query;
  let result = [...demoKeywords];
  if (status) result = result.filter(k => k.status === status);
  if (type)   result = result.filter(k => k.type === type);

  res.json({
    success: true,
    mode: "demo",
    total: result.length,
    data: result
  });
});

// POST /api/keywords
// Создаёт новое ключевое слово.
// TODO: сохранять в PostgreSQL
router.post("/", (req, res) => {
  const { keyword, type, sources, status } = req.body;

  if (!keyword) {
    return res.status(400).json({
      success: false,
      message: "Поле keyword обязательно"
    });
  }

  const newKeyword = {
    id: "kw_" + Date.now(),
    keyword,
    type: type || "brand",
    status: status || "active",
    sources: Array.isArray(sources) ? sources : ["Telegram"],
    createdAt: new Date().toISOString()
  };

  demoKeywords.unshift(newKeyword);

  res.status(201).json({
    success: true,
    mode: "demo",
    message: "Ключевое слово добавлено",
    data: newKeyword
  });
});

// PATCH /api/keywords/:id
// Обновляет ключевое слово (toggle active/inactive, изменить источники).
// TODO: обновлять в PostgreSQL
router.patch("/:id", (req, res) => {
  const kw = demoKeywords.find(k => k.id === req.params.id);
  if (!kw) {
    return res.status(404).json({ success: false, message: "Ключевое слово не найдено" });
  }
  Object.assign(kw, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, mode: "demo", data: kw });
});

// DELETE /api/keywords/:id
// Удаляет ключевое слово.
// TODO: удалять из PostgreSQL
router.delete("/:id", (req, res) => {
  const index = demoKeywords.findIndex(k => k.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Ключевое слово не найдено" });
  }
  const [removed] = demoKeywords.splice(index, 1);
  res.json({ success: true, mode: "demo", message: "Удалено", data: removed });
});

module.exports = router;
