// backend/controllers/userController.js
const User = require('../models/User');
const Blacklist = require('../models/Blacklist');
const Whitelist = require('../models/Whitelist');
const bcrypt = require('bcryptjs');

// Obtener todos los usuarios (sin password)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash');
    res.json(users);
  } catch (err) {
    console.error('getUsers', err);
    res.status(500).send('Error del servidor');
  }
};

// Actualizar usuario por ID (admin o similar)
exports.updateUser = async (req, res) => {
  const { email, name } = req.body || {};
  try {
    const toSet = {};
    if (email != null) toSet.email = email;
    if (name != null) toSet.name = name;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      toSet,
      { new: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }
    res.json(updatedUser);
  } catch (err) {
    console.error('updateUser', err);
    res.status(500).send('Error del servidor');
  }
};

// Cambiar contraseña por ID
exports.updatePassword = async (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ msg: 'La contraseña debe tener al menos 6 caracteres' });
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { passwordHash: hashedPassword },
      { new: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }
    res.json({ msg: 'Contraseña actualizada con éxito' });
  } catch (err) {
    console.error('updatePassword', err);
    res.status(500).send('Error del servidor');
  }
};

/**
 * ====== Acciones sobre el usuario autenticado ======
 */

// PUT /api/users/me  -> actualizar mi perfil (nombre/email)
exports.updateMe = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ msg: 'No autenticado' });

    const { name, email } = req.body || {};
    const toSet = {};
    if (name != null) toSet.name = name;
    if (email != null) toSet.email = email;

    const updated = await User.findByIdAndUpdate(userId, toSet, { new: true })
      .select('-passwordHash');

    if (!updated) return res.status(404).json({ msg: 'Usuario no encontrado' });
    return res.json(updated);
  } catch (e) {
    console.error('PUT /api/users/me', e);
    return res.status(500).json({ msg: 'Error interno al actualizar el perfil' });
  }
};

// DELETE /api/users/me -> eliminar mi cuenta (hard delete simple)
exports.deleteMe = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ msg: 'No autenticado' });
    }

    // Si prefieres soft delete:
    // const user = await User.findById(userId);
    // if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });
    // user.status = 'deleted';
    // await user.save();

    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) return res.status(404).json({ msg: 'Usuario no encontrado' });

    // Limpiezas opcionales (whitelist/blacklist)
    await Whitelist.deleteOne({ email: deleted.email }).catch(() => {});
    await Blacklist.create({ email: deleted.email }).catch(() => {});

    return res.status(204).send(); // No content
  } catch (e) {
    console.error('DELETE /api/users/me', e);
    return res.status(500).json({ msg: 'Error interno al eliminar cuenta' });
  }
};

// Eliminar usuario por ID (soft delete + listas)
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    user.status = 'deleted';
    await user.save();

    await Whitelist.deleteOne({ email: user.email }).catch(() => {});
    await Blacklist.create({ email: user.email }).catch(() => {});

    res.json({ msg: 'Usuario eliminado (soft delete) y agregado a blacklist' });
  } catch (err) {
    console.error('deleteUser', err);
    res.status(500).send('Error del servidor');
  }
};
