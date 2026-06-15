"use strict";

const jwt = require("jsonwebtoken");

// JWT_SECRET берётся только из env.
// В dev-режиме допустим временный fallback, но в production — обязателен .env
const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV !== "production"
    ? "kt_mediascanner_dev_secret_CHANGE_IN_PRODUCTION"
    : null
);

if (!JWT_SECRET) {
  console.error("[FATAL] JWT_SECRET не задан в .env. Сервер не может работать без него в production.");
  process.exit(1);
}

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "kt_mediascanner_auth";

/**
 * Middleware: проверяет JWT из httpOnly cookie.
 * При успехе добавляет req.user = { id, username, name, role }.
 * При ошибке возвращает 401.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Требуется авторизация",
      code: "NO_TOKEN"
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    const isExpired = err.name === "TokenExpiredError";
    return res.status(401).json({
      success: false,
      message: isExpired ? "Сессия истекла, войдите снова" : "Недействительный токен",
      code: isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN"
    });
  }
}

/**
 * Middleware-фабрика: проверяет роль пользователя.
 * Использовать после requireAuth.
 * Пример: router.get("/admin", requireAuth, requireRole("admin"), handler)
 * @param {...string} roles — список разрешённых ролей
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Требуется авторизация" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Недостаточно прав",
        code: "FORBIDDEN"
      });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, JWT_SECRET, COOKIE_NAME };
