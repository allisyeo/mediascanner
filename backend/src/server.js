"use strict";

require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const path    = require("path");

// ─── Маршруты ──────────────────────────────────────────────────────────────
const healthRouter    = require("./routes/health");
const mentionsRouter  = require("./routes/mentions");
const keywordsRouter  = require("./routes/keywords");
const employeesRouter = require("./routes/employees");
const slaRouter       = require("./routes/sla");
const telegramRouter  = require("./routes/telegram");
const instagramRouter = require("./routes/instagram");

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());               // Разрешает запросы с любого origin (для dev)
app.use(express.json());       // Парсит JSON-тело запросов
app.use(express.urlencoded({ extended: false }));

// Логирование запросов (простое, без зависимостей)
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// ─── API маршруты ───────────────────────────────────────────────────────────
app.use("/api/health",    healthRouter);
app.use("/api/mentions",  mentionsRouter);
app.use("/api/keywords",  keywordsRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/sla",       slaRouter);
app.use("/api/telegram",  telegramRouter);
app.use("/api/instagram", instagramRouter);

// ─── Раздача frontend ────────────────────────────────────────────────────────
// Express раздаёт файлы из папки frontend/ как статику.
// При переносе на VPS nginx может взять эту роль — тогда закомментировать блок.
const frontendDir = path.join(__dirname, "../../frontend");
app.use(express.static(frontendDir));

// SPA fallback: любой неизвестный GET-запрос отдаёт index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

// ─── Глобальный обработчик ошибок ───────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("[ERROR]", err.message);
  res.status(500).json({
    success: false,
    message: "Внутренняя ошибка сервера",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// ─── Запуск ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  KT MediaScanner API");
  console.log(`  http://localhost:${PORT}`);
  console.log(`  http://localhost:${PORT}/api/health`);
  console.log(`  MODE: ${process.env.NODE_ENV || "development"} (demo data)`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});

module.exports = app; // для тестов
