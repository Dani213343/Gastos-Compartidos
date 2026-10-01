// backend/controllers/cardController.js
const { Types } = require("mongoose");
const Card = require("../models/Card");

const isValidId = (id) => Types.ObjectId.isValid(id);

/* ========== LISTAR TARJETAS DEL USUARIO ========== */
/** GET /api/cards */
exports.list = async (req, res) => {
  try {
    const cards = await Card.find({ user: req.user.id })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return res.json(cards);
  } catch (err) {
    console.error("cards.list error:", err);
    return res.status(500).json({ msg: "Error del servidor" });
  }
};

/* ========== CREAR TARJETA SIMULADA ========== */
/** POST /api/cards */
exports.create = async (req, res) => {
  try {
    let {
      brand,
      last4,
      expMonth,
      expYear,
      nickname = "",
      setAsDefault = false,
    } = req.body || {};

    // Normalizar brand
    brand = String(brand || "").toUpperCase();
    const allowedBrands = new Set(["VISA", "MASTERCARD", "AMEX", "OTRA"]);
    if (!allowedBrands.has(brand)) {
      return res.status(400).json({ msg: "brand inválida" });
    }

    // Validar last4
    last4 = String(last4 || "").trim();
    if (!/^\d{4}$/.test(last4)) {
      return res.status(400).json({ msg: "last4 debe ser 4 dígitos" });
    }

    // Validar expMonth
    expMonth = Number(expMonth);
    if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) {
      return res.status(400).json({ msg: "expMonth inválido" });
    }

    // Validar / normalizar expYear
    let yearNum = Number(expYear);
    if (!Number.isInteger(yearNum)) {
      return res.status(400).json({ msg: "expYear inválido" });
    }

    // Si viene en 2 dígitos, lo interpretamos como 20xx (simulación)
    if (yearNum >= 0 && yearNum <= 99) {
      yearNum = 2000 + yearNum; // ej: 24 -> 2024
    }

    const currentYear = new Date().getFullYear();
    if (yearNum < currentYear) {
      return res.status(400).json({ msg: "expYear inválido" });
    }

    expYear = yearNum;

    nickname = String(nickname || "").trim();

    // Si se marca como default, desmarcar el resto
    if (setAsDefault) {
      await Card.updateMany(
        { user: req.user.id, isDefault: true },
        { $set: { isDefault: false } }
      );
    } else {
      // Si no hay ninguna default todavía, esta será la default
      const hasDefault = await Card.exists({
        user: req.user.id,
        isDefault: true,
      });
      if (!hasDefault) {
        setAsDefault = true;
      }
    }

    const card = await Card.create({
      user: req.user.id,
      brand,
      last4,
      expMonth,
      expYear,
      nickname,
      isDefault: !!setAsDefault,
    });

    return res.status(201).json({ msg: "Tarjeta creada", card });
  } catch (err) {
    console.error("cards.create error:", err);
    return res.status(500).json({ msg: "Error del servidor" });
  }
};

/* ========== MARCAR COMO DEFAULT ========== */
/** PATCH /api/cards/:id/default */
exports.setDefault = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ msg: "ID inválido" });
    }

    const card = await Card.findOne({ _id: id, user: req.user.id });
    if (!card) return res.status(404).json({ msg: "Tarjeta no encontrada" });

    await Card.updateMany(
      { user: req.user.id, isDefault: true },
      { $set: { isDefault: false } }
    );

    card.isDefault = true;
    await card.save();

    return res.json({ msg: "Tarjeta predeterminada actualizada", card });
  } catch (err) {
    console.error("cards.setDefault error:", err);
    return res.status(500).json({ msg: "Error del servidor" });
  }
};

/* ========== ELIMINAR TARJETA ========== */
/** DELETE /api/cards/:id */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ msg: "ID inválido" });
    }

    const card = await Card.findOne({ _id: id, user: req.user.id });
    if (!card) return res.status(404).json({ msg: "Tarjeta no encontrada" });

    const wasDefault = card.isDefault;

    await Card.deleteOne({ _id: id });

    if (wasDefault) {
      const another = await Card.findOne({ user: req.user.id }).sort({
        createdAt: -1,
      });
      if (another) {
        another.isDefault = true;
        await another.save();
      }
    }

    return res.json({ msg: "Tarjeta eliminada" });
  } catch (err) {
    console.error("cards.remove error:", err);
    return res.status(500).json({ msg: "Error del servidor" });
  }
};
