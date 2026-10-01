const AppError = require('../shared/AppError');
const { isMember } = require('../../domain/groups/groupPolicy');

class CreateExpenseUseCase {
  constructor(expenseRepo, groupRepo) {
    this.expenseRepo = expenseRepo;
    this.groupRepo = groupRepo;
  }

  async execute({ userId, payload }) {
    const {
      group, title, category = '', amount, currency = 'COP',
      date = new Date(), paidBy, splitAmong = [], notes = ''
    } = payload || {};

    const g = await this.groupRepo.findMembershipById(group);
    if (!g) throw new AppError('Grupo no encontrado', 404);

    if (!isMember(g, userId)) {
      throw new AppError('No autorizado', 403);
    }

    const memberSet = new Set((g.members || []).map(String));

    if (!memberSet.has(String(paidBy))) {
      throw new AppError('paidBy no es miembro del grupo', 422);
    }

    for (const uid of splitAmong) {
      if (!memberSet.has(String(uid))) {
        throw new AppError('splitAmong contiene usuarios fuera del grupo', 422);
      }
    }

    const exp = await this.expenseRepo.create({
      group,
      title: String(title).trim(),
      category: String(category || '').trim(),
      amount,
      currency,
      date,
      paidBy,
      splitAmong,
      notes: String(notes || '').trim(),
      createdBy: userId,
    });

    return exp;
  }
}

module.exports = CreateExpenseUseCase;
