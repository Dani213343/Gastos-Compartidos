// backend/plugins/groups/loader.js
// Carga automáticamente todos los *.plugin.js de esta carpeta

const fs = require('fs');
const path = require('path');

async function loadGroupPlugins(context) {
  const baseDir = __dirname; // carpeta actual: /backend/plugins/groups
  const files = fs.readdirSync(baseDir)
    .filter(f => f.endsWith('.plugin.js'))
    .sort(); // orden estable (opcional)

  for (const file of files) {
    const full = path.join(baseDir, file);
    try {
      const mod = require(full);
      if (typeof mod.register === 'function') {
        await mod.register(context); // { bus, models, config, log }
        context.log?.info?.(`[groups-plugin] cargado: ${file}`);
      } else {
        context.log?.warn?.(`[groups-plugin] omitido (sin register): ${file}`);
      }
    } catch (e) {
      context.log?.error?.(`[groups-plugin] error al cargar ${file}:`, e);
    }
  }
}

module.exports = { loadGroupPlugins };
