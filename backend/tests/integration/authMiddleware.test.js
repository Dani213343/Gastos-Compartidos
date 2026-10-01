// backend/tests/integration/authMiddleware.test.js

// 🔹 Mock de Blacklist para que NO toque la base de datos en los tests
jest.mock("../../models/Blacklist", () => ({
  exists: jest.fn().mockResolvedValue(false), // siempre dice "no revocado"
}));

const jwt = require("jsonwebtoken");
const auth = require("../../middleware/auth");

describe("auth middleware (integration test)", () => {
  const OLD_ENV = process.env;

  beforeAll(() => {
    // Usamos un secreto de prueba para que sign() y verify() coincidan
    process.env = { ...OLD_ENV, JWT_SECRET: "test-secret" };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  function mockRes() {
    const res = {};
    res.statusCode = 200;
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (body) => {
      res.body = body;
      return res;
    };
    return res;
  }

  test("debe poner req.user cuando el token es válido", async () => {
    const token = jwt.sign(
      { sub: "12345", email: "test@example.com" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const req = {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
      },
    };

    const res = mockRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe("12345");
    expect(req.user.email).toBe("test@example.com");
  });

  test("debe responder 401 si no hay token", async () => {
    const req = { method: "GET", headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("msg", "No autenticado");
  });

  test("debe responder 401 si el token es inválido", async () => {
    const req = {
      method: "GET",
      headers: {
        authorization: "Bearer token-falso",
      },
    };
    const res = mockRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toMatch(/inválido|expirado/i);
  });
});
