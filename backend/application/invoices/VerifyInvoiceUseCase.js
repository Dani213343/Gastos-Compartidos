class VerifyInvoiceUseCase {
  constructor({ invoiceRepository }) {
    this.invoiceRepository = invoiceRepository;
  }

  /**
   * Marca la factura como revisada manualmente.
   * No llama a DIAN ni a ningún servicio externo.
   */
  async execute({ invoiceId, userId }) {
    const invoice = await this.invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new Error("Factura no encontrada");
    }

    const detail = userId
      ? `Marcada como revisada manualmente por el usuario ${userId}`
      : "Marcada como revisada manualmente";

    const updated = await this.invoiceRepository.updateStatus(
      invoiceId,
      "MANUAL_REVIEW",
      detail,
      new Date()
    );

    return updated;
  }
}

module.exports = VerifyInvoiceUseCase;
