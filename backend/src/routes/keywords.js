"use strict";
const { Router } = require("express");
const router = Router();
const store = require("../data/keywordsStore");

router.get("/", (req, res) => {
  const result = store.getAll({ status: req.query.status, type: req.query.type });
  res.json({ success: true, total: result.length, data: result });
});

router.post("/", (req, res) => {
  const { keyword, type, sources, status } = req.body;
  if (!keyword) return res.status(400).json({ success: false, message: "Поле keyword обязательно" });
  const kw = store.add({
    id: "kw_" + Date.now(),
    keyword,
    type: type || "brand",
    status: status || "active",
    sources: Array.isArray(sources) ? sources : ["Telegram"],
    createdAt: new Date().toISOString()
  });
  res.status(201).json({ success: true, message: "Ключевое слово добавлено", data: kw });
});

router.patch("/:id", (req, res) => {
  const kw = store.update(req.params.id, req.body);
  if (!kw) return res.status(404).json({ success: false, message: "Ключевое слово не найдено" });
  res.json({ success: true, data: kw });
});

router.delete("/:id", (req, res) => {
  const removed = store.remove(req.params.id);
  if (!removed) return res.status(404).json({ success: false, message: "Ключевое слово не найдено" });
  res.json({ success: true, message: "Удалено", data: removed });
});

module.exports = router;
