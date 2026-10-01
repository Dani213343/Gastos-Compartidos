// backend/controllers/invoiceController.js

const fs = require("fs");
const { XMLParser } = require("fast-xml-parser");
const Invoice = require("../models/Invoice");

// Use case de verificación manual (opción 1) – opcional
let VerifyInvoiceUseCase;
let invoiceRepository;
try {
  invoiceRepository = require("../infrastructure/repositories/InvoiceRepository");
  VerifyInvoiceUseCase = require("../application/invoices/VerifyInvoiceUseCase");
} catch (_) {
  // si no existe esa capa, usamos directamente el modelo en verifyInvoice
}

/* ============================================================
   🔍 FUNCIÓN RECURSIVA PARA ENCONTRAR EL CUFE EN EL XML PARSEADO
   ============================================================ */
function findCufeInNode(node) {
  if (!node || typeof node !== "object") return null;

  // 1) Buscar <UUID>
  if ("UUID" in node) {
    const v = node.UUID;
    if (typeof v === "string") return v.trim();
    if (v && typeof v === "object") {
      const text = v["#text"] || v.value || v._ || null;
      if (text) return text.trim();
    }
  }

  // 2) Buscar <CUFE> o <cufe>
  if ("CUFE" in node) {
    const v = node.CUFE;
    if (typeof v === "string") return v.trim();
    if (v && typeof v === "object") {
      const text = v["#text"] || v.value || v._ || null;
      if (text) return text.trim();
    }
  }
  if ("cufe" in node) {
    const v = node.cufe;
    if (typeof v === "string") return v.trim();
    if (v && typeof v === "object") {
      const text = v["#text"] || v.value || v._ || null;
      if (text) return text.trim();
    }
  }

  // 3) Búsqueda recursiva
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (!child) continue;

    if (Array.isArray(child)) {
      for (const item of child) {
        const found = findCufeInNode(item);
        if (found) return found;
      }
    } else if (typeof child === "object") {
      const found = findCufeInNode(child);
      if (found) return found;
    }
  }

  return null;
}

/* ============================================================
   📦 EXTRAER DATOS DEL XML
   ============================================================ */
function extractInvoiceDataFromXml(xmlContent) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    removeNSPrefix: true,
    trimValues: true,
  });

  const json = parser.parse(xmlContent);

  // CUFE
  const cufe = findCufeInNode(json);
  if (!cufe) {
    throw new Error("No se encontró el CUFE en el XML");
  }

  const invoiceNode =
    json.Invoice ||
    json.InvoiceType ||
    json.Billing ||
    json["fe:Invoice"] ||
    json["Factura"] ||
    json["InvoiceDocument"] ||
    json;

  let number = null;
  try {
    number =
      invoiceNode.ID ||
      (invoiceNode.cbc && invoiceNode.cbc.ID) ||
      invoiceNode.InvoiceNumber ||
      null;
    if (number) number = String(number).trim();
  } catch (_) {
    number = null;
  }

  let issuerName = null;
  try {
    const sup =
      invoiceNode.AccountingSupplierParty ||
      (invoiceNode.cac && invoiceNode.cac.AccountingSupplierParty) ||
      invoiceNode.Supplier ||
      invoiceNode.Emisor ||
      null;

    if (sup) {
      const party =
        sup.Party || sup.party || sup.SupplierParty || sup.EmisorParty || sup;

      if (party) {
        const legal = party.PartyLegalEntity || party.partyLegalEntity || party;
        issuerName =
          legal.RegistrationName ||
          legal.Name ||
          party.Name ||
          party.name ||
          null;

        if (issuerName) issuerName = String(issuerName).trim();
      }
    }
  } catch (_) {
    issuerName = null;
  }

  let totalAmount = null;
  let currency = null;

  try {
    const legalMon =
      invoiceNode.LegalMonetaryTotal ||
      (invoiceNode.cac && invoiceNode.cac.LegalMonetaryTotal) ||
      invoiceNode.MonetaryTotal ||
      null;

    if (legalMon) {
      const payable =
        legalMon.PayableAmount ||
        legalMon.payableAmount ||
        legalMon.TotalAmount ||
        null;

      if (payable != null) {
        if (typeof payable === "object") {
          const text = payable["#text"] || payable.value || payable._ || null;
          if (text != null) {
            totalAmount = parseFloat(text);
          }
          currency = payable.currencyID || payable.currency || null;
        } else {
          totalAmount = parseFloat(payable);
        }
      }
    }
  } catch (_) {
    totalAmount = null;
  }

  return {
    cufe: String(cufe).trim(),
    number,
    issuerName,
    totalAmount: isNaN(totalAmount) ? null : totalAmount,
    currency: currency || null,
  };
}

/* ============================================================
   📥 SUBIR FACTURA XML
   ============================================================ */
exports.uploadInvoice = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?.id;

    if (!req.file) {
      return res.status(400).json({ message: "No se recibió archivo XML" });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;

    const xmlContent = fs.readFileSync(filePath, "utf8");

    let extracted;
    try {
      extracted = extractInvoiceDataFromXml(xmlContent);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    const { cufe, number, issuerName, totalAmount, currency } = extracted;

    const payload = {
      group: groupId,
      filePath,
      originalName,
      cufe,
      number,
      issuerName,
      totalAmount,
      status: "PENDING",
      verificationDetail: null,
      verifiedAt: null,
      createdBy: userId || null,
    };

    if (currency) payload.currency = currency;

    const invoice = await Invoice.create(payload);

    return res.status(201).json({
      ok: true,
      message: "Factura cargada correctamente",
      invoice,
    });
  } catch (err) {
    return next(err);
  }
};

/* ============================================================
   📄 LISTAR FACTURAS
   ============================================================ */
exports.listInvoices = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const invoices = await Invoice.find({ group: groupId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(invoices);
  } catch (err) {
    return next(err);
  }
};

/* ============================================================
   ✔️ VERIFICACIÓN MANUAL
   ============================================================ */
exports.verifyInvoice = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.user?.id || null;

    if (VerifyInvoiceUseCase && invoiceRepository) {
      const uc = new VerifyInvoiceUseCase({ invoiceRepository });
      const invoice = await uc.execute({ invoiceId, userId });

      return res.status(200).json({
        ok: true,
        message:
          "Factura marcada como revisada manualmente. Valida el CUFE en la DIAN.",
        invoice,
      });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }

    invoice.status = "MANUAL_REVIEW";
    invoice.verificationDetail = userId
      ? `Marcada como revisada manualmente por el usuario ${userId}`
      : "Marcada como revisada manualmente";
    invoice.verifiedAt = new Date();

    await invoice.save();

    return res.status(200).json({
      ok: true,
      message:
        "Factura marcada como revisada manualmente. Valida el CUFE en la DIAN.",
      invoice,
    });
  } catch (err) {
    return next(err);
  }
};

/* ============================================================
   🗑 ELIMINAR FACTURA
   ============================================================ */
exports.deleteInvoice = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }

    // Borrar archivo físico (si existe)
    if (invoice.filePath && fs.existsSync(invoice.filePath)) {
      try {
        fs.unlinkSync(invoice.filePath);
      } catch (err) {
        console.warn("No se pudo borrar archivo:", err.message);
      }
    }

    await invoice.deleteOne();

    return res.json({
      ok: true,
      message: "Factura eliminada correctamente",
      invoiceId,
    });
  } catch (err) {
    return next(err);
  }
};
