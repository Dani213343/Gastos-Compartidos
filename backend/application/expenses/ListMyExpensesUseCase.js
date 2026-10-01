class ListMyExpensesUseCase {
  constructor(expenseRepo) {
    this.expenseRepo = expenseRepo;
  }

  async execute({ userId }) {
    return this.expenseRepo.listByCreator(userId);
  }
}

module.exports = ListMyExpensesUseCase;
