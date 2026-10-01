// backend/models/Card.js
const { Schema, model, Types } = require("mongoose");

const cardSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    brand: {
      type: String,
      enum: ["VISA", "MASTERCARD", "AMEX", "OTRA"],
      required: true,
    },
    last4: {
      type: String,
      required: true,
      minlength: 4,
      maxlength: 4,
    },
    expMonth: {
      type: Number,
      min: 1,
      max: 12,
      required: true,
    },
    expYear: {
      type: Number,
      required: true,
    },
    nickname: {
      type: String,
      trim: true,
      default: "",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = model("Card", cardSchema);
