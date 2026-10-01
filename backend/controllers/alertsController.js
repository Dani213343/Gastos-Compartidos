const Expense = require("../models/Expense");
// Usa tu bus / plugins si ya tienes (vi /backend/kernel/bus.js)
exports.nudgeNow = async (req, res) => {
  const { expenseId } = req.params;
  // 1) cargar expense, 2) resolver participantes deudores, 3) enviar email/push
  // bus.emit("alerts:nudge", { expense, sender: req.user.id })
  return res.json({ ok: true });
};

exports.scheduleWeekly = async (req, res) => {
  const { expenseId } = req.params;
  // guarda un job (agenda/cron) con frecuencia semanal para el cobrador (paidBy)
  return res.json({ ok: true });
};

exports.unschedule = async (req, res) => {
  const { expenseId } = req.params;
  // cancelar job de recordatorio
  return res.json({ ok: true });
};
