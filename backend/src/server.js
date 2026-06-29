"use strict";

require("dotenv").config();

const express      = require("express");
const cors         = require("cors");
const cookieParser = require("cookie-parser");
const path         = require("path");

// ─── Маршруты ──────────────────────────────────────────────────────────────
const healthRouter    = require("./routes/health");
const authRouter      = require("./routes/auth");
const mentionsRouter  = require("./routes/mentions");
const keywordsRouter  = require("./routes/keywords");
const employeesRouter = require("./routes/employees");
const slaRouter       = require("./routes/sla");
const telegramRouter  = require("./routes/telegram");
const instagramRouter = require("./routes/instagram");
const usersRouter     = require("./routes/users");
const monitorRouter   = require("./routes/monitor");

// ─── Middleware авторизации ─────────────────────────────────────────────────
const { requireAuth } = require("./middleware/auth");
const { addAlert }    = require("./data/alerts");

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin:      true,   // в dev разрешаем любой origin
  credentials: true    // обязательно для передачи cookie в cross-origin запросах
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser()); // читает httpOnly cookies

// Логирование запросов + перехват HTTP 5xx для алертов
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path}`);

  const orig = res.json.bind(res);
  res.json = function(body) {
    if (res.statusCode >= 500) {
      addAlert({
        level:   "error",
        source:  req.method + " " + req.path,
        message: (body && body.message) || "HTTP " + res.statusCode,
        detail:  JSON.stringify(body)
      });
    } else if (res.statusCode >= 400 && res.statusCode !== 401 && res.statusCode !== 404) {
      addAlert({
        level:   "warn",
        source:  req.method + " " + req.path,
        message: (body && body.message) || "HTTP " + res.statusCode,
        detail:  null
      });
    }
    return orig(body);
  };
  next();
});

// ─── Открытые маршруты (без авторизации) ───────────────────────────────────
app.use("/api/health", healthRouter);
app.use("/api/auth",   authRouter);   // /api/auth/login, /api/auth/me, /api/auth/logout

// ─── Защищённые API маршруты (требуют JWT cookie) ──────────────────────────
app.use("/api/mentions",  requireAuth, mentionsRouter);
app.use("/api/keywords",  requireAuth, keywordsRouter);
app.use("/api/employees", requireAuth, employeesRouter);
app.use("/api/sla",       requireAuth, slaRouter);
app.use("/api/telegram",  requireAuth, telegramRouter);
app.use("/api/instagram", requireAuth, instagramRouter);
app.use("/api/users",     requireAuth, usersRouter);
app.use("/api/monitor",   requireAuth, monitorRouter);

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
  addAlert({
    level:   "error",
    source:  req.method + " " + req.path,
    message: err.message || "Внутренняя ошибка сервера",
    detail:  err.stack ? err.stack.split("\n").slice(0, 3).join(" | ") : null
  });
  res.status(500).json({
    success: false,
    message: "Внутренняя ошибка сервера",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// ─── Запуск (только локально, не на Vercel) ─────────────────────────────────
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  KT MediaScanner API");
    console.log(`  http://localhost:${PORT}`);
    console.log(`  http://localhost:${PORT}/login.html`);
    console.log(`  http://localhost:${PORT}/api/health`);
    console.log(`  MODE: ${process.env.NODE_ENV || "development"} (demo data)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  });
}

module.exports = app;
