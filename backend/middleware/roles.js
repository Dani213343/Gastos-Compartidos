// backend/middleware/roles.js
const GroupRole = require("../models/GroupRole");
const { requireValidId } = require("../utils/groupUtils");

function requireAdminForGroup(paramName = "id") {
  return async (req, res, next) => {
    const groupId = req.params[paramName];
    if (!requireValidId(groupId)) return res.status(400).json({ msg: "ID inválido" });
    const userId = req.user?.id || req.user?.sub || req.user?._id;
    if (!userId) return res.status(401).json({ msg: "No autenticado" });

    const role = await GroupRole.findOne({ group: groupId, user: userId, role: { $in: ["owner","admin"] } });
    if (!role) return res.status(403).json({ msg: "Requiere rol de administrador" });
    next();
  };
}

function requireOwnerForGroup(paramName = "id") {
  return async (req, res, next) => {
    const groupId = req.params[paramName];
    if (!requireValidId(groupId)) return res.status(400).json({ msg: "ID inválido" });
    const userId = req.user?.id || req.user?.sub || req.user?._id;
    if (!userId) return res.status(401).json({ msg: "No autenticado" });

    const role = await GroupRole.findOne({ group: groupId, user: userId, role: "owner" });
    if (!role) return res.status(403).json({ msg: "Requiere ser propietario del grupo" });
    next();
  };
}

module.exports = { requireAdminForGroup, requireOwnerForGroup };
