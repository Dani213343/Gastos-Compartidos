// backend/utils/expenseHelpers.js

/**
 * Divide un monto total entre un número de miembros.
 * Lanza error si amount < 0 o members <= 0.
 */
function splitAmount(amount, members) {
  const a = Number(amount);
  const m = Number(members);

  if (!Number.isFinite(a) || a < 0) {
    throw new Error("Monto inválido");
  }
  if (!Number.isInteger(m) || m <= 0) {
    throw new Error("Número de miembros inválido");
  }

  return a / m;
}

module.exports = { splitAmount };
