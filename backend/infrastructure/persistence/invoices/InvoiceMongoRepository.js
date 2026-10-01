const InvoiceRepository = require("../../../domain/invoices/InvoiceRepository");
const InvoiceModel = require("../../../models/Invoice");

class InvoiceMongoRepository extends InvoiceRepository {
  async create(invoiceEntity) {
    const doc = await InvoiceModel.create({
      group: invoiceEntity.group,
      expense: invoiceEntity.expense,
      uploadedBy: invoiceEntity.uploadedBy,
      filePath: invoiceEntity.filePath,
      cufe: invoiceEntity.cufe,
      number: invoiceEntity.number,
      issuerName: invoiceEntity.issuerName,
      issuerNit: invoiceEntity.issuerNit,
      totalAmount: invoiceEntity.totalAmount,
      currency: invoiceEntity.currency,
      status: invoiceEntity.status,
      verificationDetail: invoiceEntity.verificationDetail,
      verifiedAt: invoiceEntity.verifiedAt,
    });

    return doc;
  }

  async findByGroup(groupId) {
    return InvoiceModel.find({ group: groupId })
      .populate("uploadedBy", "name email")
      .populate("expense")
      .sort({ createdAt: -1 })
      .lean();
  }

  async findById(id) {
    return InvoiceModel.findById(id)
      .populate("uploadedBy", "name email")
      .populate("expense")
      .lean();
  }

  async updateStatus(id, status, detail, verifiedAt = new Date()) {
    return InvoiceModel.findByIdAndUpdate(
      id,
      {
        status,
        verificationDetail: detail,
        verifiedAt,
      },
      { new: true }
    ).lean();
  }
}

module.exports = InvoiceMongoRepository;
