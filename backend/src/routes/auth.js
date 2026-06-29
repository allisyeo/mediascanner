"use strict";

const { Router }       = require("express");
const bcrypt           = require("bcryptjs");
const jwt              = require("jsonwebtoken");
const rateLimit        = require("express-rate-limit");
const fs               = require("fs");
const path             = require("path");
const { findByUsername, findById, publicUser } = require("../data/users");
const { JWT_SECRET, COOKIE_NAME, requireAuth } = require("../middleware/auth");

// ─── Хранилище заявок на регистрацию (JSON-файл) ───────────────────────────
const PENDING_FILE = process.env.VERCEL
  ? "/tmp/kt_pending.json"
  : path.join(__dirname, "../data/pending.json");

function loadPending() {
  try {
    if (fs.existsSync(PENDING_FILE)) {
      return JSON.parse(fs.readFileSync(PENDING_FILE, "utf8"));
    }
  } catch {}
  return [];
}

function savePending(list) {
  fs.writeFileSync(PENDING_FILE, JSON.stringify(list, null, 2), "utf8");
}

const router = Router();

// Rate limit: в dev — 100 попыток, в production — 10 за 15 минут
const loginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              process.env.NODE_ENV === "production" ? 10 : 100,
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
    // Читаем актуальные данные из хранилища, а не из JWT
    const user = findById(payload.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Пользователь не найден", code: "USER_NOT_FOUND" });
    }
    return res.json({ success: true, user: publicUser(user) });
  } catch {
    return res.status(401).json({
      success: false,
      message: "Сессия истекла",
      code:    "INVALID_TOKEN"
    });
  }
});

// ─── POST /api/auth/register ────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { name, email, phone, password, method } = req.body;

  if (!name || !password) {
    return res.status(400).json({ success: false, message: "Заполните все обязательные поля" });
  }
  if (method === "email" && !email) {
    return res.status(400).json({ success: false, message: "Введите email" });
  }
  if (method === "phone" && !phone) {
    return res.status(400).json({ success: false, message: "Введите номер телефона" });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: "Пароль должен быть минимум 8 символов" });
  }

  const list = loadPending();

  const duplicate = list.find(r =>
    (email && r.email === email) || (phone && r.phone === phone)
  );
  if (duplicate) {
    return res.status(409).json({ success: false, message: "Заявка с такими данными уже существует" });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const entry = {
    id:           `pending_${Date.now()}`,
    name:         name.trim(),
    email:        email?.trim() || null,
    phone:        phone?.trim() || null,
    method:       method || "phone",
    passwordHash,
    status:       "pending",
    createdAt:    new Date().toISOString()
  };

  list.push(entry);
  savePending(list);

  console.log(`[AUTH] Новая заявка на регистрацию: ${name} (${email || phone})`);

  return res.json({
    success: true,
    message: "Заявка принята. Администратор активирует вашу учётную запись."
  });
});

// GET /api/auth/pending — список заявок (только для администраторов)
router.get("/pending", requireAuth, (req, res) => {
  const list = loadPending();
  const safe = list.map(({ passwordHash: _, ...r }) => r);
  return res.json({ success: true, total: safe.length, data: safe });
});

// POST /api/auth/pending/:id/approve — одобрить заявку
router.post("/pending/:id/approve", requireAuth, (req, res) => {
  const list = loadPending();
  const idx  = list.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Заявка не найдена" });

  const pending = list[idx];
  const { _addUser } = require("../data/users");

  const newUser = {
    id:           pending.id.replace("pending_", "user_"),
    username:     (pending.email || pending.phone || pending.id).replace(/[^a-z0-9]/gi, ".").toLowerCase().slice(0, 20),
    name:         pending.name,
    role:         "manager",
    status:       "Менеджер",
    email:        pending.email || null,
    phone:        pending.phone || null,
    createdAt:    pending.createdAt,
    lastLogin:    null,
    active:       true,
    passwordHash: pending.passwordHash
  };

  _addUser(newUser);
  list.splice(idx, 1);
  savePending(list);
  console.log(`[AUTH] Заявка одобрена: ${pending.name}`);

  const { passwordHash: _, ...pub } = newUser;
  return res.json({ success: true, message: "Пользователь активирован", user: pub });
});

// POST /api/auth/pending/:id/reject — отклонить заявку
router.post("/pending/:id/reject", requireAuth, (req, res) => {
  const list = loadPending();
  const idx  = list.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Заявка не найдена" });

  const pending = list[idx];
  list.splice(idx, 1);
  savePending(list);
  console.log(`[AUTH] Заявка отклонена: ${pending.name}`);

  return res.json({ success: true, message: "Заявка отклонена" });
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
