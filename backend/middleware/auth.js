// backend/middleware/auth.js

const jwt = require('jsonwebtoken');

let Blacklist;
try { Blacklist = require('../models/Blacklist'); } catch (_) {}

module.exports = async function auth(req, res, next) {
  // Deja pasar preflight por si acaso
  if (req.method === 'OPTIONS') return next();

  const authHeader = req.headers.authorization || '';
  const xToken = req.headers['x-auth-token'];

  let token = null;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (typeof xToken === 'string' && xToken.trim()) {
    token = xToken.trim();
  }

  if (!token) return res.status(401).json({ msg: 'No autenticado' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Revocación opcional
    if (Blacklist) {
      const revoked = await Blacklist.exists({ token });
      if (revoked) return res.status(401).json({ msg: 'Token revocado' });
    }

    // Normaliza el ID desde sub | id | _id
    const id = decoded.sub || decoded.id || decoded._id;
    if (!id) return res.status(401).json({ msg: 'Token inválido' });

    req.user = { id: String(id), email: decoded.email || null };
    return next();
  } catch (e) {
    console.error('Error del token:', e.message);
    return res.status(401).json({ msg: 'Token inválido o expirado' });
  }
};
