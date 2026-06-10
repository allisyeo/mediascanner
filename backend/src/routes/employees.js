"use strict";
const { Router } = require("express");
const router = Router();
const { employees } = require("../data/demoData");

// GET /api/employees
// Возвращает список сотрудников.
// TODO: заменить на запросы к PostgreSQL (таблица employees)
router.get("/", (req, res) => {
  const { status } = req.query;
  const result = status
    ? employees.filter(e => e.status === status)
    : employees;

  res.json({
    success: true,
    mode: "demo",
    total: result.length,
    data: result
  });
});

// GET /api/employees/:id
router.get("/:id", (req, res) => {
  const emp = employees.find(e => e.id === req.params.id);
  if (!emp) {
    return res.status(404).json({ success: false, message: "Сотрудник не найден" });
  }
  res.json({ success: true, data: emp });
});

module.exports = router;
