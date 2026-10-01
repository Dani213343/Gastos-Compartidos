// backend/plugins/groups/audit.plugin.js
// Plugin simple: registra en consola los eventos de grupos

module.exports.register = async ({ bus, log }) => {
  const L = log || console;

  bus.on('group.created', ({ groupId, ownerId }) => {
    L.info?.(`[audit] group.created { groupId:${groupId}, ownerId:${ownerId} }`);
  });

  bus.on('group.updated', ({ groupId }) => {
    L.info?.(`[audit] group.updated { groupId:${groupId} }`);
  });

  bus.on('group.deleted', ({ groupId }) => {
    L.info?.(`[audit] group.deleted { groupId:${groupId} }`);
  });
};
