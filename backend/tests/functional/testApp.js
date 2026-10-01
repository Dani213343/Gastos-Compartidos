// backend/tests/functional/testApp.js
const express = require("express");
const auth = require("../../middleware/auth");

const app = express();
app.use(express.json());

// Ruta pública
app.get("/public", (req, res) => {
  res.json({ ok: true, message: "Ruta pública" });
});

// Ruta protegida con tu middleware auth real
app.get("/protected", auth, (req, res) => {
  res.json({
    ok: true,
    userId: req.user.id,
    message: "Ruta protegida accesible",
  });
});

module.exports = app;
