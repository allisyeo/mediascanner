"use strict";
const { Router } = require("express");
const router = Router();

// GET /api/health
// Проверка состояния сервера. Используется frontend для определения доступности API.
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "KT MediaScanner API",
    mode: "demo",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

module.exports = router;
