// backend/models/Expense.js
const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const ExpenseSchema = new Schema(
  {
    // Relación
    group: { type: Types.ObjectId, ref: "Group", required: true, index: true },

    // Datos del gasto
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    category: { type: String, default: "Otro", trim: true, maxlength: 60 },
    amount: { type: Number, required: true, min: 0.01 }, // > 0
    currency: { type: String, enum: ["COP", "USD", "EUR"], default: "COP" },
    date: { type: Date, default: Date.now },
    allDay: { type: Boolean, default: false }, // ← indica si es “solo fecha”

    dueDate: { type: Date, default: null },

    // Quién pagó
    paidBy: { type: Types.ObjectId, ref: "User", required: true },

    // División
    splitEvenly: { type: Boolean, default: true }, // compatibilidad
    splitAmong: [{ type: Types.ObjectId, ref: "User" }], // participantes

    // Metadatos útiles
    notes: { type: String, default: "", trim: true, maxlength: 500 },
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true },

  },
  { timestamps: true }
);

// Índice para listados por fecha dentro de un grupo
ExpenseSchema.index({ group: 1, date: -1, createdAt: -1 });
ExpenseSchema.index({ dueDate: 1 });

// Normalización básica antes de guardar
ExpenseSchema.pre("save", function (next) {
  // Asegurar únicos en splitAmong y filtrar falsy
  if (Array.isArray(this.splitAmong)) {
    const uniq = Array.from(
      new Set(
        this.splitAmong
          .filter(Boolean)
          .map((x) => x.toString())
      )
    ).map((id) => new Types.ObjectId(id));
    this.splitAmong = uniq;
  } else {
    this.splitAmong = [];
  }

  // Seguridad: amount positivo
  if (typeof this.amount === "number" && this.amount <= 0) {
    return next(new Error("El monto debe ser mayor que 0"));
  }

  next();
});

module.exports = mongoose.model("Expense", ExpenseSchema);
