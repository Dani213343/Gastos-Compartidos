// Reglas de pertenencia y permisos para grupos (DOMINIO)

const isMember = (group, uid) =>
  Array.isArray(group.members) && group.members.map(String).includes(String(uid));

const isAdminLike = (group, uid) =>
  String(group.owner) === String(uid) ||
  (Array.isArray(group.admins) && group.admins.map(String).includes(String(uid)));

module.exports = { isMember, isAdminLike };
