'use strict';

const jwt  = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'conequipos_secret_key_change_in_production';

/**
 * Middleware: verifica que el request tenga un JWT válido.
 * Extrae el payload y lo adjunta a req.user.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No autorizado. Inicie sesión.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, nombre, usuario, rol }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'La sesión ha expirado. Inicie sesión nuevamente.' });
    }
    return res.status(401).json({ success: false, message: 'Token inválido.' });
  }
}

/**
 * Middleware: verifica que el usuario tenga el rol 'Administrador'.
 * Debe usarse DESPUÉS de requireAuth.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.rol !== 'Administrador') {
    return res.status(403).json({ success: false, message: 'Acceso denegado. Se requiere rol Administrador.' });
  }
  next();
}

/**
 * Genera un JWT firmado para el usuario autenticado.
 * @param {Object} user - { id, nombre, usuario, rol }
 * @returns {string} token
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, nombre: user.nombre, usuario: user.usuario, rol: user.rol },
    JWT_SECRET,
    { expiresIn: '10h' }
  );
}

module.exports = { requireAuth, requireAdmin, generateToken };
