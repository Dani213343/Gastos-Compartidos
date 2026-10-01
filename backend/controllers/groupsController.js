// backend/controllers/groupsController.js

const Group = require("../models/Group");

// Obtener solo los grupos del usuario autenticado
exports.getMyGroups = async (req, res) => {
  try {
    // 🔑 CAMBIO CLAVE: Añadir .lean() para devolver objetos JS planos
    const groups = await Group.find({ members: req.user.id }).lean(); 
    
    // Opcional: Si el front-end necesita el ID del usuario como '_id' en los objetos anidados
    // Si no hay populate, esto ya debería funcionar para el campo 'owner'.
    
    res.json(groups);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error del servidor");
  }
};