'use strict';

const bcrypt     = require('bcrypt');
const { pool }   = require('../config/db');

const SALT_ROUNDS = 12;

/**
 * Modelo Usuario.
 * Encapsula toda la lógica de acceso a la tabla `usuarios`.
 */
const User = {

  /**
   * Busca un usuario por su username.
   * @param {string} usuario
   * @returns {Object|null}
   */
  async findByUsername(usuario) {
    const [rows] = await pool.execute(
      'SELECT * FROM usuarios WHERE usuario = ? AND activo = 1 LIMIT 1',
      [usuario]
    );
    return rows[0] || null;
  },

  /**
   * Busca un usuario por ID.
   */
  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, nombre, usuario, rol, activo, creado_en FROM usuarios WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Lista todos los usuarios (sin exponer el hash de contraseña).
   */
  async findAll() {
    const [rows] = await pool.execute(
      `SELECT id, nombre, usuario, rol, activo, creado_en, actualizado_en
       FROM usuarios ORDER BY nombre ASC`
    );
    return rows;
  },

  /**
   * Verifica si una contraseña en texto plano coincide con el hash almacenado.
   * @param {string} plain
   * @param {string} hash
   */
  async verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  },

  /**
   * Crea un nuevo usuario.
   * @param {Object} data - { nombre, usuario, password, rol }
   */
  async create(data) {
    const { nombre, usuario, password, rol } = data;
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.execute(
      `INSERT INTO usuarios (nombre, usuario, password, rol) VALUES (?, ?, ?, ?)`,
      [nombre, usuario, hash, rol || 'Operador']
    );
    return result.insertId;
  },

  /**
   * Actualiza los datos de un usuario (sin cambiar la contraseña).
   */
  async update(id, data) {
    const { nombre, usuario, rol, activo } = data;
    await pool.execute(
      `UPDATE usuarios SET nombre = ?, usuario = ?, rol = ?, activo = ? WHERE id = ?`,
      [nombre, usuario, rol, activo !== undefined ? activo : 1, id]
    );
  },

  /**
   * Cambia la contraseña de un usuario.
   * @param {number} id
   * @param {string} newPassword - Texto plano (se hashea aquí)
   */
  async changePassword(id, newPassword) {
    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.execute(
      'UPDATE usuarios SET password = ? WHERE id = ?',
      [hash, id]
    );
  },

  /**
   * Desactiva (soft-delete) un usuario.
   */
  async deactivate(id) {
    await pool.execute('UPDATE usuarios SET activo = 0 WHERE id = ?', [id]);
  },

  /**
   * Verifica si un username ya existe (para validación de unicidad).
   */
  async usernameExists(usuario, excludeId = null) {
    let sql    = 'SELECT id FROM usuarios WHERE usuario = ?';
    const params = [usuario];
    if (excludeId) { sql += ' AND id != ?'; params.push(excludeId); }
    const [rows] = await pool.execute(sql, params);
    return rows.length > 0;
  },
};

module.exports = User;
