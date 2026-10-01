// backend/tests/unit/expenseHelpers.test.js
const { splitAmount } = require("../../utils/expenseHelpers");

describe("splitAmount (unit test)", () => {
  test("divide correctamente un monto positivo entre miembros", () => {
    const result = splitAmount(90000, 3);
    expect(result).toBe(30000);
  });

  test("acepta strings numéricos y los convierte", () => {
    const result = splitAmount("100000", "4");
    expect(result).toBe(25000);
  });

  test("lanza error si el monto es negativo", () => {
    expect(() => splitAmount(-10, 2)).toThrow("Monto inválido");
  });

  test("lanza error si el número de miembros es 0", () => {
    expect(() => splitAmount(1000, 0)).toThrow("Número de miembros inválido");
  });
});
