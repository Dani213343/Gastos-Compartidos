// backend/routes/users.js
const express = require('express');
const router = express.Router();
const usersController = require('../controllers/userController');
const auth = require('../middleware/auth'); // << IMPORTANTE

// ===== Rutas sobre el usuario autenticado =====
router.put('/me', auth, usersController.updateMe);
router.delete('/me', auth, usersController.deleteMe);

// ===== CRUD general (si aplica) =====
router.get('/', auth, usersController.getUsers);
router.put('/:id', auth, usersController.updateUser);
router.put('/:id/password', auth, usersController.updatePassword);
router.delete('/:id', auth, usersController.deleteUser);

module.exports = router;
