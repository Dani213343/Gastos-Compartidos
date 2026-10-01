// backend/routes/invoice.routes.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const invoiceController = require("../controllers/invoiceController");
const { uploadInvoiceXml } = require("../middleware/uploadXmlMiddleware");

// POST /api/groups/:groupId/invoices/upload
router.post(
  "/groups/:groupId/invoices/upload",
  auth,
  uploadInvoiceXml,
  invoiceController.uploadInvoice
);

// GET /api/groups/:groupId/invoices
router.get(
  "/groups/:groupId/invoices",
  auth,
  invoiceController.listInvoices
);

// POST /api/invoices/:invoiceId/verify
router.post(
  "/invoices/:invoiceId/verify",
  auth,
  invoiceController.verifyInvoice
);

// 🚮 DELETE /api/invoices/:invoiceId  -> eliminar factura
router.delete(
  "/invoices/:invoiceId",
  auth,
  invoiceController.deleteInvoice
);

module.exports = router;
