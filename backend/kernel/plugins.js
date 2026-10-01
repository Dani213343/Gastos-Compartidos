// backend/kernel/plugins.js
// Cargador general de plugins para Express (versión ligera y compatible con tu estructura actual)

const fs = require('fs');
const path = require('path');

/**
 * Carga módulos tipo plugin desde una carpeta base (por ejemplo /routes o /plugins).
 * Cada plugin puede exportar:
 *   - register(app, deps) → se ejecuta con el contexto (Express app + dependencias)
 *   - router / prefix → para montar rutas tradicionales
 */
async function loadPlugins(app, deps, baseDir = path.join(__dirname, '..', 'routes')) {
  const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.js'));

  for (const f of files) {
    const filePath = path.join(baseDir, f);

    try {
      const mod = require(filePath);

      if (typeof mod.register === 'function') {
        // Caso 1: plugin moderno (usa register)
        await mod.register(app, deps);
        console.log(`[plugin] Cargado: ${f}`);
      } else if (typeof mod === 'function') {
        // Caso 2: módulo exporta función directa (compatibilidad)
        await mod(app, deps);
        console.log(`[plugin] Cargado (función): ${f}`);
      } else if (mod && mod.router) {
        // Caso 3: exporta router y opcionalmente prefix
        app.use(mod.prefix || '/', mod.router);
        console.log(`[plugin] Cargado (router): ${f}`);
      } else {
        console.log(`[plugin] Omitido: ${f} (sin interfaz válida)`);
      }

    } catch (err) {-
      console.error(`[plugin] Error al cargar ${f}:`, err.message);
    }
  }
}

module.exports = { loadPlugins };
