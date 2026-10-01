const router = require("express").Router();
const { auth } = require("../middleware/auth");
const Alerts = require("../controllers/alertsController");

router.post("/nudge/:expenseId", auth, Alerts.nudgeNow);           // “Recordar ahora”
router.post("/schedule/:expenseId", auth, Alerts.scheduleWeekly);   // Programar semanal
router.delete("/schedule/:expenseId", auth, Alerts.unschedule);     // Detener

module.exports = router;
