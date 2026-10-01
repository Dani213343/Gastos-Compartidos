// backend/controllers/expenseController.js
const { Types } = require('mongoose');
const Expense = require('../models/Expense'); // solo para el caso "mine"
const ExpenseMongoRepository = require('../infrastructure/persistence/expenses/ExpenseMongoRepository');
const GroupMongoRepository = require('../infrastructure/persistence/groups/GroupMongoRepository');

const ListGroupExpensesUseCase = require('../application/expenses/ListGroupExpensesUseCase');
const CreateExpenseUseCase = require('../application/expenses/CreateExpenseUseCase');
const UpdateExpenseUseCase = require('../application/expenses/UpdateExpenseUseCase');
const DeleteExpenseUseCase = require('../application/expenses/DeleteExpenseUseCase');
const ListMyExpensesUseCase = require('../application/expenses/ListMyExpensesUseCase');
const AppError = require('../application/shared/AppError');

// Instancia de repos y casos de uso
const expenseRepo = new ExpenseMongoRepository();
const groupRepo = new GroupMongoRepository();

const listGroupExpensesUC = new ListGroupExpensesUseCase(expenseRepo, groupRepo);
const createExpenseUC = new CreateExpenseUseCase(expenseRepo, groupRepo);
const updateExpenseUC = new UpdateExpenseUseCase(expenseRepo, groupRepo);
const deleteExpenseUC = new DeleteExpenseUseCase(expenseRepo, groupRepo);
const listMyExpensesUC = new ListMyExpensesUseCase(expenseRepo);

/* Helper para manejar errores de casos de uso */
function handleError(res, err, label) {
  console.error(`${label} error:`, err);
  if (err instanceof AppError || typeof err.status === 'number') {
    return res.status(err.status).json({ msg: err.message });
  }
  return res.status(500).json({ msg: 'Error del servidor' });
}

/* ============================================================
   GET /api/expenses?group=:groupId&mine=pending|owed
   ============================================================ */
exports.list = async (req, res) => {
  try {
    const { group: groupId, mine } = req.query || {};

    // ---- Caso especial: mine=pending|owed (igual que antes) ----
    if (mine) {
      const mineStr = String(mine);
      if (!['pending', 'owed'].includes(mineStr)) {
        return res.status(400).json({ msg: "mine debe ser 'pending' o 'owed'" });
      }

      let filter = {};
      if (mineStr === 'pending') {
        // Gastos donde participo pero NO pagué → yo debo a paidBy
        filter = {
          splitAmong: req.user.id,
          paidBy: { $ne: req.user.id },
        };
      } else {
        // Gastos que yo pagué y hay otros participantes → me deben
        filter = {
          paidBy: req.user.id,
          splitAmong: { $exists: true, $not: { $size: 0 } },
        };
      }

      const expenses = await Expense.find(filter)
        .populate('group', 'name')
        .sort({ date: -1, createdAt: -1 })
        .select('title amount currency paidBy splitAmong group date dueDate createdAt')
        .lean();

      return res.json(expenses);
    }

    // ---- Caso normal: listar por grupo usando UseCase ----
    if (!Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ msg: 'group inválido' });
    }

    const expenses = await listGroupExpensesUC.execute({
      groupId,
      userId: req.user.id,
    });

    return res.json(expenses);
  } catch (err) {
    return handleError(res, err, 'expenses.list');
  }
};

/* ============================================================
   POST /api/expenses  (crear gasto)
   ============================================================ */
exports.create = async (req, res) => {
  try {
    const { group } = req.body || {};
    if (!Types.ObjectId.isValid(group)) {
      return res.status(400).json({ msg: 'group inválido' });
    }

    const exp = await createExpenseUC.execute({
      userId: req.user.id,
      payload: req.body,
    });

    return res.status(201).json({ msg: 'Gasto creado', expense: exp });
  } catch (err) {
    return handleError(res, err, 'expenses.create');
  }
};

/* ============================================================
   PUT/PATCH /api/expenses/:id  (actualizar gasto)
   ============================================================ */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'ID inválido' });
    }

    const exp = await updateExpenseUC.execute({
      expenseId: id,
      userId: req.user.id,
      changes: req.body || {},
    });

    return res.json({ msg: 'Gasto actualizado', expense: exp });
  } catch (err) {
    return handleError(res, err, 'expenses.update');
  }
};

/* ============================================================
   DELETE /api/expenses/:id (eliminar gasto)
   ============================================================ */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'ID inválido' });
    }

    await deleteExpenseUC.execute({
      expenseId: id,
      userId: req.user.id,
    });

    return res.json({ msg: 'Gasto eliminado' });
  } catch (err) {
    return handleError(res, err, 'expenses.remove');
  }
};

/* ============================================================
   COMPAT: addExpense (re-usa create)
   ============================================================ */
exports.addExpense = async (req, res) => {
  try {
    const { description, amount, groupId, paidBy, splitAmong } = req.body || {};
    // Reusar create con mapeo a title/notes
    req.body = {
      group: groupId,
      title: description || 'Gasto',
      category: '',
      amount: Number(amount),
      currency: 'COP',
      date: new Date(),
      paidBy,
      splitAmong: Array.isArray(splitAmong) ? splitAmong : [],
      notes: '',
    };
    return exports.create(req, res);
  } catch (err) {
    return handleError(res, err, 'expenses.addExpense');
  }
};

/* ============================================================
   GET /api/expenses/mine (si tienes una ruta separada)
   ============================================================ */
exports.getMyExpenses = async (req, res) => {
  try {
    const expenses = await listMyExpensesUC.execute({
      userId: req.user.id,
    });
    return res.json(expenses);
  } catch (err) {
    return handleError(res, err, 'expenses.getMyExpenses');
  }
};
