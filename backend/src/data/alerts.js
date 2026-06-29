"use strict";

// Кольцевой буфер алертов — хранит последние MAX_ALERTS записей
const MAX_ALERTS = 200;
const alerts = [];

function addAlert({ level = "error", source, message, detail = null }) {
  alerts.unshift({
    id:        Date.now() + Math.random().toString(36).slice(2, 6),
    level,     // "error" | "warn" | "info"
    source,    // "/api/mentions", "auth", и т.д.
    message,
    detail,
    ts:        new Date().toISOString()
  });
  if (alerts.length > MAX_ALERTS) alerts.length = MAX_ALERTS;
}

function getAlerts(limit = 50) {
  return alerts.slice(0, limit);
}

function clearAlerts() {
  alerts.length = 0;
}

function countByLevel() {
  const counts = { error: 0, warn: 0, info: 0 };
  for (const a of alerts) counts[a.level] = (counts[a.level] || 0) + 1;
  return counts;
}

module.exports = { addAlert, getAlerts, clearAlerts, countByLevel };
