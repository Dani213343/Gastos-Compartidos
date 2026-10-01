// backend/models/Invoice.js
const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const InvoiceSchema = new Schema(
  {
    // Grupo al que pertenece la factura
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },

    // Archivo físico subido
    filePath: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },

    // CUFE de la DIAN (clave)
    cufe: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    // Datos extraídos del XML (todos opcionales)
    number: {
      type: String,
      trim: true,
    },
    issuerName: {
      type: String,
      trim: true,
    },
    totalAmount: {
      type: Number,
    },

    // Moneda de la factura: opcional, pero si viene debe estar en el enum
    currency: {
      type: String,
      enum: ["COP", "USD", "EUR"],
      default: "COP",
    },

    // Estado de verificación
    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED", "MANUAL_REVIEW"],
      default: "PENDING",
    },

    verificationDetail: {
      type: String,
      default: null,
      trim: true,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    // Quién subió / verificó
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("Invoice", InvoiceSchema);
