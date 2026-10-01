// backend/models/Group.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const GroupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    currency: { type: String, enum: ['COP', 'USD', 'EUR'], default: 'COP' },
    isFavorite: { type: Boolean, default: false },

    // miembros del grupo
    members: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],

    // dueño y admins
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    lastActivity: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Protección: asegura owner ∈ members ∧ admins
GroupSchema.pre('save', function (next) {
  const idStr = (id) => (id ? id.toString() : '');
  const uniq = (arr) =>
    Array.from(new Set((arr || []).filter(Boolean).map((x) => idStr(x))));

  const ownerId = idStr(this.owner);
  const members = uniq(this.members);
  const admins = uniq(this.admins);

  if (ownerId) {
    if (!members.includes(ownerId)) members.push(ownerId);
    if (!admins.includes(ownerId)) admins.push(ownerId);
  }

  this.members = members;
  this.admins = admins;
  next();
});

module.exports = mongoose.model('Group', GroupSchema);
