const AppError = require('../shared/AppError');
const { isAdminLike } = require('../../domain/groups/groupPolicy');

class UpdateExpenseUseCase {
  constructor(expenseRepo, groupRepo) {
    this.expenseRepo = expenseRepo;
    this.groupRepo = groupRepo;
  }

  async execute({ expenseId, userId, changes }) {
    const exp = await this.expenseRepo.findById(expenseId);
    if (!exp) throw new AppError('No encontrado', 404);

    const g = await this.groupRepo.findMembershipById(exp.group);
    if (!g) throw new AppError('Grupo no encontrado', 404);

    const canEdit =
      isAdminLike(g, userId) || String(exp.createdBy) === String(userId);
    if (!canEdit) throw new AppError('Sin permisos para editar', 403);

    const memberSet = new Set((g.members || []).map(String));
    if (changes.paidBy && !memberSet.has(String(changes.paidBy))) {
      throw new AppError('paidBy no es miembro del grupo', 422);
    }
    if (Array.isArray(changes.splitAmong)) {
      for (const uid of changes.splitAmong) {
        if (!memberSet.has(String(uid))) {
          throw new AppError('splitAmong contiene usuarios fuera del grupo', 422);
        }
      }
    }

    if (changes.title !== undefined) exp.title = String(changes.title).trim();
    if (changes.category !== undefined) exp.category = String(changes.category || '').trim();
    if (changes.amount !== undefined) exp.amount = changes.amount;
    if (changes.currency !== undefined) exp.currency = changes.currency;
    if (changes.date !== undefined) exp.date = changes.date;
    if (changes.paidBy !== undefined) exp.paidBy = changes.paidBy;
    if (changes.splitAmong !== undefined) exp.splitAmong = changes.splitAmong;
    if (changes.notes !== undefined) exp.notes = String(changes.notes || '').trim();

    await this.expenseRepo.save(exp);
    return exp;
  }
}

module.exports = UpdateExpenseUseCase;
