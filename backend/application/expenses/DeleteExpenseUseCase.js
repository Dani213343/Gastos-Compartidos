const AppError = require('../shared/AppError');
const { isAdminLike } = require('../../domain/groups/groupPolicy');

class DeleteExpenseUseCase {
  constructor(expenseRepo, groupRepo) {
    this.expenseRepo = expenseRepo;
    this.groupRepo = groupRepo;
  }

  async execute({ expenseId, userId }) {
    const exp = await this.expenseRepo.findById(expenseId);
    if (!exp) throw new AppError('No encontrado', 404);

    const g = await this.groupRepo.findMembershipById(exp.group);
    if (!g) throw new AppError('Grupo no encontrado', 404);

    const canDelete =
      isAdminLike(g, userId) || String(exp.createdBy) === String(userId);
    if (!canDelete) throw new AppError('Sin permisos para eliminar', 403);

    await this.expenseRepo.deleteById(expenseId);
  }
}

module.exports = DeleteExpenseUseCase;
