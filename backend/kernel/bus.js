// backend/kernel/bus.js
const { EventEmitter } = require('events');

// Bus de eventos simple para comunicación interna (IPC) de plugins
const bus = new EventEmitter();

// Evita warnings si añades varios listeners (ajusta si lo necesitas)
bus.setMaxListeners(50);

module.exports = bus;
