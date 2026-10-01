// backend/routes/cards.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const cardController = require("../controllers/cardController");

// Todas las rutas requieren usuario autenticado
router.get("/", auth, cardController.list);
router.post("/", auth, cardController.create);
router.patch("/:id/default", auth, cardController.setDefault);
router.delete("/:id", auth, cardController.remove);

module.exports = router;
