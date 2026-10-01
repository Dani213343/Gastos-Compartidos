// backend/models/GroupRole.js
const { Schema, model, Types } = require("mongoose");

const GroupRoleSchema = new Schema(
  {
    group: { type: Types.ObjectId, ref: "Group", required: true, index: true },
    user:  { type: Types.ObjectId, ref: "User", required: true, index: true },
    role:  { type: String, enum: ["owner", "admin"], required: true },
  },
  { timestamps: true }
);

// Un usuario no puede repetir rol en un grupo
GroupRoleSchema.index({ group: 1, user: 1 }, { unique: true });

// Asegura 1 solo owner por grupo (índice parcial)
GroupRoleSchema.index(
  { group: 1, role: 1 },
  { unique: true, partialFilterExpression: { role: "owner" } }
);

module.exports = model("GroupRole", GroupRoleSchema);
