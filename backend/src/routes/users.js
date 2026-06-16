"use strict";

const express = require("express");
const bcrypt  = require("bcryptjs");
const router  = express.Router();
const { allPublicUsers, findById, _updateUserPassword, _updateUser } = require("../data/users");

const DEFAULT_PASSWORD = "Aa1234@";

// GET /api/users — список всех пользователей (только admin)
router.get("/", (req, res) => {
  const { status, active, search } = req.query;
  let list = allPublicUsers();

  if (status) list = list.filter(u => u.status === status);
  if (active !== undefined) list = list.filter(u => String(u.active) === active);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(u =>
      (u.name     || "").toLowerCase().includes(q) ||
      (u.email    || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q) ||
      (u.phone    || "").includes(q)
    );
  }

  res.json({ success: true, total: list.length, data: list });
});

// GET /api/users/:id
router.get("/:id", (req, res) => {
  const user = findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: "Пользователь не найден" });
  const { passwordHash: _omit, ...pub } = user;
  res.json({ success: true, data: pub });
});

// PATCH /api/users/:id — обновить роль, статус, активность
router.patch("/:id", (req, res) => {
  const user = findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: "Пользователь не найден" });

  const allowed = ["role", "status", "active"];
  const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }

  if (!Object.keys(updates).length)
    return res.status(400).json({ success: false, message: "Нет данных для обновления" });

  const updated = _updateUser(user.id, updates);
  const { passwordHash: _omit, ...pub } = updated;
  console.log(`[USERS] Обновлён ${user.username}: ${JSON.stringify(updates)}`);
  res.json({ success: true, data: pub });
});

// POST /api/users/:id/reset-password — сброс пароля на стандартный Aa1234@
router.post("/:id/reset-password", async (req, res) => {
  const user = findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: "Пользователь не найден" });

  const newHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  _updateUserPassword(user.id, newHash);

  console.log(`[USERS] Пароль сброшен: ${user.name} (${user.username})`);
  res.json({ success: true, message: `Пароль сброшен на стандартный для ${user.name}` });
});

module.exports = router;
