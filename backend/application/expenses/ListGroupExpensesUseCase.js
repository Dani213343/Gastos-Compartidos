const AppError = require('../shared/AppError');
const { isMember } = require('../../domain/groups/groupPolicy');

class ListGroupExpensesUseCase {
  constructor(expenseRepo, groupRepo) {
    this.expenseRepo = expenseRepo;
    this.groupRepo = groupRepo;
  }

  async execute({ groupId, userId }) {
    const group = await this.groupRepo.findMembershipById(groupId);
    if (!group) throw new AppError('Grupo no encontrado', 404);

    if (!isMember(group, userId)) {
      throw new AppError('No autorizado', 403);
    }

    const expenses = await this.expenseRepo.listByGroup(groupId);
    return expenses;
  }
}

module.exports = ListGroupExpensesUseCase;
