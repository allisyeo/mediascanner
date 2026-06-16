"use strict";

const express = require("express");
const router  = express.Router();
const { allPublicUsers, findById } = require("../data/users");

// GET /api/users — список всех пользователей (только admin)
router.get("/", (req, res) => {
  const { status, active, search } = req.query;
  let list = allPublicUsers();

  if (status) list = list.filter(u => u.status === status);
  if (active !== undefined) list = list.filter(u => String(u.active) === active);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.phone.includes(q)
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

module.exports = router;
