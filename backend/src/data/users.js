"use strict";

// ─── Пользователи KT MediaScanner ──────────────────────────────────────────
// Данные хранятся в users.json (рядом с этим файлом).
// При первом запуске, если файл отсутствует, создаётся из SEED-данных.
//
// TODO (production):
//   - Перенести пользователей в таблицу users в PostgreSQL
//   - Задать надёжный JWT_SECRET в .env (обязательно для production)

const fs   = require("fs");
const path = require("path");

const USERS_FILE = process.env.VERCEL
  ? "/tmp/kt_users_v3.json"
  : path.join(__dirname, "users.json");

// ─── Начальные данные (используются только если users.json не существует) ──
const SEED = [
  {
    id:           "admin_001",
    username:     "allisyeo",
    name:         "Алишер Йео",
    role:         "admin",
    status:       "Администратор сайта",
    email:        "allisyeo@kazakhtelecom.kz",
    phone:        "+7 701 000 0001",
    createdAt:    "2024-01-15T09:00:00.000Z",
    lastLogin:    new Date().toISOString(),
    active:       true,
    passwordHash: "$2b$12$FRr2SUvVQBznaO3i.BW2zuwtiNi0XtNiaOnjNBWKC8xYDUK7xus9O"
  },
  {
    id:           "user_002",
    username:     "d.seitkali",
    name:         "Дильназ Сейткали",
    role:         "manager",
    status:       "Руководитель",
    email:        "d.seitkali@kazakhtelecom.kz",
    phone:        "+7 702 123 4567",
    createdAt:    "2024-02-10T10:30:00.000Z",
    lastLogin:    "2026-06-14T08:22:00.000Z",
    active:       true,
    passwordHash: ""
  },
  {
    id:           "user_003",
    username:     "k.sydykova",
    name:         "Каракоз Сыздыкова",
    role:         "manager",
    status:       "Менеджер",
    email:        "k.sydykova@kazakhtelecom.kz",
    phone:        "+7 705 234 5678",
    createdAt:    "2024-03-05T08:15:00.000Z",
    lastLogin:    "2026-06-15T11:45:00.000Z",
    active:       true,
    passwordHash: ""
  },
  {
    id:           "user_004",
    username:     "a.bekova",
    name:         "Айгерим Бекова",
    role:         "manager",
    status:       "Менеджер",
    email:        "a.bekova@kazakhtelecom.kz",
    phone:        "+7 707 345 6789",
    createdAt:    "2024-04-20T14:00:00.000Z",
    lastLogin:    "2026-06-13T16:10:00.000Z",
    active:       true,
    passwordHash: ""
  },
  {
    id:           "user_005",
    username:     "r.nurmagambetov",
    name:         "Рустем Нурмагамбетов",
    role:         "manager",
    status:       "Руководитель",
    email:        "r.nurmagambetov@kazakhtelecom.kz",
    phone:        "+7 771 456 7890",
    createdAt:    "2024-05-12T09:45:00.000Z",
    lastLogin:    "2026-06-10T09:00:00.000Z",
    active:       false,
    passwordHash: ""
  }
];

// ─── Загрузка / инициализация ───────────────────────────────────────────────
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    }
  } catch (e) {
    console.error("[USERS] Ошибка чтения users.json, использую seed-данные:", e.message);
  }
  // Первый запуск — сохраняем seed в файл
  saveUsers(SEED);
  return SEED.map(u => ({ ...u }));
}

function saveUsers(list) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), "utf8");
  } catch (e) {
    console.error("[USERS] Ошибка сохранения users.json:", e.message);
  }
}

// Рабочий массив — загружается при старте сервера
const users = loadUsers();

// ─── Публичные функции ──────────────────────────────────────────────────────
function findByUsername(username) {
  return users.find(u => u.username === username);
}

function findById(id) {
  return users.find(u => u.id === id);
}

function publicUser(user) {
  const { passwordHash: _omit, ...pub } = user;
  return pub;
}

function allPublicUsers() {
  return users.map(publicUser);
}

function _addUser(user) {
  users.push(user);
  saveUsers(users);
}

function _updateUserPassword(id, newHash) {
  const user = users.find(u => u.id === id);
  if (user) {
    user.passwordHash = newHash;
    saveUsers(users);
  }
}

function _updateUser(id, fields) {
  const user = users.find(u => u.id === id);
  if (user) {
    Object.assign(user, fields);
    saveUsers(users);
  }
  return user;
}

module.exports = { findByUsername, findById, publicUser, allPublicUsers, _addUser, _updateUserPassword, _updateUser };
