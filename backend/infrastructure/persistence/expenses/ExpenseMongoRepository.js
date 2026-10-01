const ExpenseRepository = require('../../../domain/expenses/ExpenseRepository');
const ExpenseModel = require('../../../models/Expense');

class ExpenseMongoRepository extends ExpenseRepository {
  async listByGroup(groupId) {
    return ExpenseModel
      .find({ group: groupId })
      .sort({ date: -1, createdAt: -1 })
      .lean();
  }

  async findById(id) {
    return ExpenseModel.findById(id);
  }

  async create(data) {
    return ExpenseModel.create(data);
  }

  async save(expenseDoc) {
    return expenseDoc.save();
  }

  async deleteById(id) {
    return ExpenseModel.deleteOne({ _id: id });
  }

  async listByCreator(userId) {
    return ExpenseModel
      .find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .populate('group', 'name currency')
      .lean();
  }
}

module.exports = ExpenseMongoRepository;
