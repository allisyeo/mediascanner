"use strict";

// ─── Сотрудники ────────────────────────────────────────────────────────────
const employees = [
  { id: "emp_1", name: "Ляззат Баймагамбетова",        role: "Старший оператор", telegramUsername: "@lyazzat_b", telegramChatId: "", status: "active" },
  { id: "emp_2", name: "Каракоз Сыздыкова",             role: "Оператор",         telegramUsername: "@karakoz_s", telegramChatId: "", status: "active" },
  { id: "emp_3", name: "Жансая Медеубаева",              role: "Оператор",         telegramUsername: "@zhansaya_m", telegramChatId: "", status: "active" },
  { id: "emp_4", name: "Альменбетова Айнур Мейрамбековна", role: "Модератор",     telegramUsername: "@ainur_a",   telegramChatId: "", status: "active" }
];

// ─── Ключевые слова ────────────────────────────────────────────────────────
const keywords = [
  { id: "kw_1", keyword: "Казахтелеком",         type: "brand",      status: "active", sources: ["Twitter", "TikTok", "Facebook", "Threads", "Telegram"], createdAt: "2026-01-10T09:00:00.000Z" },
  { id: "kw_2", keyword: "интернет не работает", type: "problem",    status: "active", sources: ["Twitter", "TikTok", "Facebook", "Threads", "Telegram"], createdAt: "2026-01-12T10:30:00.000Z" },
  { id: "kw_3", keyword: "мусин",                type: "person",     status: "active", sources: ["Twitter", "TikTok", "Facebook", "Threads"],             createdAt: "2026-03-01T09:00:00.000Z" }
];

// ─── SLA по сотрудникам ────────────────────────────────────────────────────
const slaData = [
  { employeeId: "emp_1", employeeName: "Ляззат Баймагамбетова",          role: "Старший оператор", assigned: 0, processed: 0, avgResponseTime: "—", slaTarget: "30 мин", slaFact: "—", overdue: 0, status: "good" },
  { employeeId: "emp_2", employeeName: "Каракоз Сыздыкова",               role: "Оператор",         assigned: 0, processed: 0, avgResponseTime: "—", slaTarget: "30 мин", slaFact: "—", overdue: 0, status: "good" },
  { employeeId: "emp_3", employeeName: "Жансая Медеубаева",                role: "Оператор",         assigned: 0, processed: 0, avgResponseTime: "—", slaTarget: "30 мин", slaFact: "—", overdue: 0, status: "good" },
  { employeeId: "emp_4", employeeName: "Альменбетова Айнур Мейрамбековна", role: "Модератор",        assigned: 0, processed: 0, avgResponseTime: "—", slaTarget: "30 мин", slaFact: "—", overdue: 0, status: "good" }
];

// Упоминания хранятся в mentionsStore (mentions.json / /tmp/kt_mentions.json)
const mentions = [];

module.exports = { mentions, keywords, employees, slaData };
