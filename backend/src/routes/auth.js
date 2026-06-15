"use strict";

const { Router }       = require("express");
const bcrypt           = require("bcryptjs");
const jwt              = require("jsonwebtoken");
const rateLimit        = require("express-rate-limit");
const { findByUsername, publicUser } = require("../data/users");
const { JWT_SECRET, COOKIE_NAME }    = require("../middleware/auth");

const router = Router();

// Rate limit: не более 10 попыток входа за 15 минут с одного IP
const loginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 минут
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  message: {
    success: false,
    message: "Слишком много попыток входа. Попробуйте через 15 минут.",
    code:    "TOO_MANY_REQUESTS"
  }
});

// Настройки cookie
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: process.env.COOKIE_SAME_SITE || "lax",
  secure:   process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
  maxAge:   24 * 60 * 60 * 1000 // 24 часа в миллисекундах
};

// ─── POST /api/auth/login ───────────────────────────────────────────────────
// Принимает username + password, проверяет через bcrypt,
// записывает JWT в httpOnly cookie, возвращает публичные поля user.
router.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Введите логин и пароль",
      code:    "MISSING_CREDENTIALS"
    });
  }

  // Поиск пользователя
  const user = findByUsername(username.trim().toLowerCase());

  // Проверяем пароль даже если пользователь не найден
  // (защита от timing attack — одинаковое время ответа)
  const dummyHash = "$2b$12$invalidhashfortimingprotectiononly000000000000000000000";
  const hashToCheck = user ? user.passwordHash : dummyHash;
  const passwordValid = await bcrypt.compare(password, hashToCheck);

  if (!user || !passwordValid) {
    return res.status(401).json({
      success: false,
      message: "Неверный логин или пароль",
      code:    "INVALID_CREDENTIALS"
    });
  }

  // Создаём JWT (payload — только публичные поля)
  const tokenPayload = {
    id:       user.id,
    username: user.username,
    name:     user.name,
    role:     user.role
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "24h" });

  // Устанавливаем httpOnly cookie — frontend НЕ имеет доступа к токену через JS
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

  return res.json({
    success: true,
    user:    publicUser(user)
  });
});

// ─── GET /api/auth/me ───────────────────────────────────────────────────────
// Проверяет cookie и возвращает текущего пользователя.
// Используется frontend при загрузке страницы.
router.get("/me", (req, res) => {
  const jwt_lib = require("jsonwebtoken");
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Не авторизован",
      code:    "NO_TOKEN"
    });
  }

  try {
    const payload = jwt_lib.verify(token, JWT_SECRET);
    return res.json({
      success: true,
      user: {
        id:       payload.id,
        username: payload.username,
        name:     payload.name,
        role:     payload.role
      }
    });
  } catch {
    return res.status(401).json({
      success: false,
      message: "Сессия истекла",
      code:    "INVALID_TOKEN"
    });
  }
});

// ─── POST /api/auth/logout ──────────────────────────────────────────────────
// Очищает auth cookie.
router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    secure:   process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production"
  });
  return res.json({ success: true, message: "Вы вышли из системы" });
});

module.exports = router;
