const fs = require("fs");
const xml2js = require("xml2js");
const InvoiceEntity = require("../../domain/invoices/InvoiceEntity");

class UploadInvoiceUseCase {
  /**
   * @param {Object} deps
   * @param {InvoiceRepository} deps.invoiceRepository
   */
  constructor({ invoiceRepository }) {
    this.invoiceRepository = invoiceRepository;
  }

  async execute({ groupId, expenseId, userId, filePath }) {
    // Leer XML
    const xml = fs.readFileSync(filePath, "utf8");

    // Parsear XML
    const parser = new xml2js.Parser({ explicitArray: false });
    const data = await parser.parseStringPromise(xml);

    // OJO: estas rutas dependen del formato de tu XML (UBL). Ajusta según tu caso real.
    const invoiceRoot = data["Invoice"] || data["fe:Invoice"] || data;
    const legalMonetaryTotal =
      invoiceRoot["cac:LegalMonetaryTotal"] || invoiceRoot["LegalMonetaryTotal"];

    const cufe =
      invoiceRoot["cbc:UUID"] ||
      invoiceRoot["UUID"] ||
      (invoiceRoot["ext:UBLExtensions"] &&
        invoiceRoot["ext:UBLExtensions"]["cbc:UUID"]);

    const number =
      invoiceRoot["cbc:ID"] || invoiceRoot["ID"] || "UNKNOWN_NUMBER";

    const issuer =
      invoiceRoot["cac:AccountingSupplierParty"] ||
      invoiceRoot["AccountingSupplierParty"] ||
      {};

    const party = issuer["cac:Party"] || issuer["Party"] || {};
    const partyName =
      (party["cac:PartyName"] &&
        party["cac:PartyName"]["cbc:Name"]) ||
      party["cbc:Name"] ||
      "Proveedor desconocido";

    const partyId =
      (party["cac:PartyTaxScheme"] &&
        party["cac:PartyTaxScheme"]["cbc:CompanyID"]) ||
      party["cbc:CompanyID"] ||
      null;

    const payableAmount =
      legalMonetaryTotal &&
      (legalMonetaryTotal["cbc:PayableAmount"] ||
        legalMonetaryTotal["PayableAmount"]);

    const totalAmount = payableAmount
      ? parseFloat(payableAmount["_"] || payableAmount)
      : null;

    const currency =
      (payableAmount && payableAmount["$"] && payableAmount["$"]["currencyID"]) ||
      "COP";

    if (!cufe) {
      throw new Error("No se pudo encontrar el CUFE en el XML");
    }

    const invoiceEntity = new InvoiceEntity({
      group: groupId,
      expense: expenseId || null,
      uploadedBy: userId,
      filePath,
      cufe: String(cufe).trim(),
      number: String(number).trim(),
      issuerName: String(partyName).trim(),
      issuerNit: partyId ? String(partyId).trim() : null,
      totalAmount,
      currency,
      status: "PENDING",
    });

    const doc = await this.invoiceRepository.create(invoiceEntity);
    return doc;
  }
}

module.exports = UploadInvoiceUseCase;
