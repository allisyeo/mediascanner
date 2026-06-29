"use strict";

const { Router } = require("express");
const { getAlerts, clearAlerts, countByLevel, addAlert } = require("../data/alerts");
const { allPublicUsers } = require("../data/users");
const fs   = require("fs");
const path = require("path");

const router = Router();

// Все API-группы для проверки статуса
const API_GROUPS = [
  { id: "health",    label: "Health",    path: "/api/health",    method: "GET",  auth: false },
  { id: "auth",      label: "Auth / Me", path: "/api/auth/me",   method: "GET",  auth: false },
  { id: "mentions",  label: "Mentions",  path: "/api/mentions",  method: "GET",  auth: true  },
  { id: "keywords",  label: "Keywords",  path: "/api/keywords",  method: "GET",  auth: true  },
  { id: "employees", label: "Employees", path: "/api/employees", method: "GET",  auth: true  },
  { id: "sla",       label: "SLA",       path: "/api/sla",       method: "GET",  auth: true  },
  { id: "telegram",  label: "Telegram",  path: "/api/telegram",  method: "GET",  auth: true  },
  { id: "instagram", label: "Instagram", path: "/api/instagram", method: "GET",  auth: true  },
  { id: "users",     label: "Users",     path: "/api/users",     method: "GET",  auth: true  },
];

// GET /api/monitor/status — статус всех сервисов
router.get("/status", (req, res) => {
  const pendingPath = path.join(__dirname, "../data/pending.json");
  const usersPath   = path.join(__dirname, "../data/users.json");

  let pendingCount = 0;
  try { pendingCount = JSON.parse(fs.readFileSync(pendingPath, "utf8")).length; } catch {}

  const users    = allPublicUsers();
  const active   = users.filter(u => u.active).length;
  const inactive = users.filter(u => !u.active).length;

  const counts = countByLevel();
  const uptime = process.uptime();
  const mem    = process.memoryUsage();

  res.json({
    success: true,
    server: {
      uptime:   Math.floor(uptime),
      uptimeFmt: fmtUptime(uptime),
      memMB:    Math.round(mem.rss / 1024 / 1024),
      nodeVersion: process.version,
      pid:      process.pid
    },
    users:    { total: users.length, active, inactive, pending: pendingCount },
    alerts:   counts,
    apiGroups: API_GROUPS,
    ts: new Date().toISOString()
  });
});

// GET /api/monitor/alerts?limit=50&level=error
router.get("/alerts", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const level = req.query.level || null;
  let list = getAlerts(200);
  if (level) list = list.filter(a => a.level === level);
  res.json({ success: true, total: list.length, data: list.slice(0, limit) });
});

// DELETE /api/monitor/alerts — очистить все алерты
router.delete("/alerts", (req, res) => {
  clearAlerts();
  addAlert({ level: "info", source: "monitor", message: "Журнал алертов очищен пользователем " + (req.user?.name || req.user?.username || "?") });
  res.json({ success: true, message: "Алерты очищены" });
});

// POST /api/monitor/alerts — добавить тестовый алерт
router.post("/alerts/test", (req, res) => {
  addAlert({ level: "warn", source: "test", message: "Тестовый алерт от " + (req.user?.name || "admin") });
  res.json({ success: true });
});

function fmtUptime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}

module.exports = router;
