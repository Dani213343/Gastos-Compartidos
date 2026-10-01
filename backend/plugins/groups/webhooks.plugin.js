// backend/plugins/groups/webhooks.plugin.js
// Envía POST a una URL cuando ocurren eventos de grupos.
// Requiere variable de entorno GROUPS_WEBHOOK_URL

let fetchFn = null;
try {
  // node-fetch v2 (compatible con CommonJS)
  fetchFn = require('node-fetch'); // npm i node-fetch@2
} catch (_) {
  // Si no está instalado, el plugin se desactiva silenciosamente
}

module.exports.register = async ({ bus, config, log }) => {
  const L = log || console;
  const url = process.env.GROUPS_WEBHOOK_URL || config?.GROUPS_WEBHOOK_URL;

  if (!url) {
    L.info?.('[webhooks] desactivado: falta GROUPS_WEBHOOK_URL');
    return;
  }
  if (!fetchFn) {
    L.warn?.('[webhooks] desactivado: falta dependencia node-fetch@2');
    return;
  }

  const post = async (event, payload) => {
    try {
      await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          payload,
          at: new Date().toISOString()
        }),
      });
    } catch (e) {
      L.error?.('[webhooks] error enviando webhook:', e.message || e);
    }
  };

  bus.on('group.created', (p) => post('group.created', p));
  bus.on('group.updated', (p) => post('group.updated', p));
  bus.on('group.deleted', (p) => post('group.deleted', p));

  L.info?.('[webhooks] plugin registrado');
};
