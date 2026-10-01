// backend/tests/functional/authFlow.test.js

// 🔹 Mock de Blacklist para que NO use Mongo en las rutas protegidas
jest.mock("../../models/Blacklist", () => ({
  exists: jest.fn().mockResolvedValue(false),
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("./testApp");

describe("Flujo funcional con auth (functional test)", () => {
  const OLD_ENV = process.env;

  beforeAll(() => {
    process.env = { ...OLD_ENV, JWT_SECRET: "test-secret" };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test("la ruta /public responde sin autenticación", async () => {
    const res = await request(app).get("/public").expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        ok: true,
        message: "Ruta pública",
      })
    );
  });

  test("la ruta /protected falla sin token", async () => {
    const res = await request(app).get("/protected").expect(401);

    expect(res.body).toHaveProperty("msg", "No autenticado");
  });

  test("la ruta /protected responde 200 con token válido", async () => {
    const token = jwt.sign(
      { sub: "abc123", email: "user@example.com" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        ok: true,
        userId: "abc123",
      })
    );
  });
});
