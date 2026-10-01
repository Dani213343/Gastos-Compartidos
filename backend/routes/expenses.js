// backend/routes/expenses.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { createExpenseSchema, updateExpenseSchema } = require("../middleware/validators");

const expenseController = require("../controllers/expenseController");

// GET /api/expenses?group=...&mine=...
router.get("/", auth, expenseController.list);

// POST /api/expenses
router.post(
  "/",
  auth,
  validate.body(createExpenseSchema),
  expenseController.create
);

// PUT/PATCH /api/expenses/:id
router.put(
  "/:id",
  auth,
  validate.body(updateExpenseSchema),
  expenseController.update
);
router.patch(
  "/:id",
  auth,
  validate.body(updateExpenseSchema),
  expenseController.update
);

// DELETE /api/expenses/:id
router.delete("/:id", auth, expenseController.remove);

module.exports = router;
