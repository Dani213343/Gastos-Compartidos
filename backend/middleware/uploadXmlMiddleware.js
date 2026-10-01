const multer = require("multer");
const path = require("path");

// Carpeta donde se van a guardar las facturas XML
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "..", "uploads", "invoices"));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || ".xml";
    const name = `invoice_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "text/xml" || file.mimetype === "application/xml") {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos XML"), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = {
  uploadInvoiceXml: upload.single("invoiceXml"), // campo form-data: invoiceXml
};
