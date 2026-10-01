class ListGroupInvoicesUseCase {
  constructor({ invoiceRepository }) {
    this.invoiceRepository = invoiceRepository;
  }

  async execute({ groupId }) {
    return this.invoiceRepository.findByGroup(groupId);
  }
}

module.exports = ListGroupInvoicesUseCase;
