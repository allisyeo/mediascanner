"use strict";
const { Router } = require("express");
const router = Router();
const { slaData } = require("../data/demoData");

// GET /api/sla
// Возвращает SLA-статистику по сотрудникам.
// TODO: пересчитывать из реальных данных mentions в PostgreSQL
router.get("/", (req, res) => {
  // Пересчёт summary поверх demo-данных
  const total    = slaData.reduce((s, e) => s + e.assigned, 0);
  const processed = slaData.reduce((s, e) => s + e.processed, 0);
  const overdue  = slaData.reduce((s, e) => s + e.overdue, 0);
  const avgSla   = slaData.length
    ? Math.round(slaData.reduce((s, e) => s + parseInt(e.slaFact), 0) / slaData.length)
    : 0;

  res.json({
    success: true,
    mode: "demo",
    summary: {
      totalAssigned: total,
      totalProcessed: processed,
      totalOverdue: overdue,
      avgSlaFact: avgSla + "%"
    },
    data: slaData
  });
});

module.exports = router;
