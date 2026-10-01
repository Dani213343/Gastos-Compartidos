class InvoiceEntity {
  constructor(props) {
    this.id = props.id;
    this.group = props.group;
    this.expense = props.expense;
    this.uploadedBy = props.uploadedBy;
    this.filePath = props.filePath;
    this.cufe = props.cufe;
    this.number = props.number;
    this.issuerName = props.issuerName;
    this.issuerNit = props.issuerNit;
    this.totalAmount = props.totalAmount;
    this.currency = props.currency || "COP";
    this.status = props.status || "PENDING";
    this.verificationDetail = props.verificationDetail || null;
    this.verifiedAt = props.verifiedAt || null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}

module.exports = InvoiceEntity;
