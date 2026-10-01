// Entidad de dominio pura, sin Mongoose ni Express
class ExpenseEntity {
  constructor({ id = null, groupId, userId, description, amount, currency, createdAt = new Date() }) {
    if (!groupId || !userId) throw new Error("Expense needs groupId and userId");
    if (amount <= 0) throw new Error("Amount must be positive");

    this.id = id;
    this.groupId = groupId;
    this.userId = userId;
    this.description = description;
    this.amount = amount;
    this.currency = currency || "COP";
    this.createdAt = createdAt;
  }
}

module.exports = ExpenseEntity;
