class InvoiceRepository {
  async create(invoiceEntity) {
    throw new Error("Method not implemented");
  }

  async findByGroup(groupId) {
    throw new Error("Method not implemented");
  }

  async findById(id) {
    throw new Error("Method not implemented");
  }

  async updateStatus(id, status, detail, verifiedAt) {
    throw new Error("Method not implemented");
  }
}

module.exports = InvoiceRepository;
