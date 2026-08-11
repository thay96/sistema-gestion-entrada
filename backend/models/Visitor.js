'use strict';

const { pool } = require('../config/db');

/**
 * Modelo Visitante.
 * Encapsula toda la lógica de acceso a la tabla `visitantes`.
 */
const Visitor = {

  /**
   * Busca un visitante por su número de documento.
   * Usado para auto-completar el formulario de registro de entrada.
   * @param {string} documento
   * @returns {Object|null} Visitante o null si no existe
   */
  async findByDocumento(documento) {
    const [rows] = await pool.execute(
      'SELECT * FROM visitantes WHERE documento = ? LIMIT 1',
      [documento]
    );
    return rows[0] || null;
  },

  /**
   * Busca visitantes por nombre (búsqueda parcial) o por documento exacto.
   * Usado en la pantalla de Registrar Salida.
   * @param {string} query - Nombre o documento
   * @returns {Array}
   */
  async search(query) {
    const like = `%${query}%`;
    const [rows] = await pool.execute(
      `SELECT * FROM visitantes
       WHERE documento LIKE ? OR nombre LIKE ?
       ORDER BY nombre ASC
       LIMIT 20`,
      [like, like]
    );
    return rows;
  },

  /**
   * Crea un nuevo visitante si no existe, o actualiza su información si ya existe.
   * Garantiza que no haya duplicados por documento.
   * @param {Object} data - Datos del visitante
   * @returns {Object} { id, isNew }
   */
  async upsert(data) {
    const { documento, nombre, empresa, tipo_persona, telefono, correo } = data;

    // Verificar si ya existe
    const existing = await this.findByDocumento(documento);

    if (existing) {
      // Actualizar datos en caso de cambio
      await pool.execute(
        `UPDATE visitantes
         SET nombre = ?, empresa = ?, tipo_persona = ?, telefono = ?, correo = ?, actualizado_en = NOW()
         WHERE id = ?`,
        [nombre, empresa, tipo_persona, telefono || null, correo, existing.id]
      );
      return { id: existing.id, isNew: false };
    }

    // Crear nuevo visitante
    const [result] = await pool.execute(
      `INSERT INTO visitantes (documento, nombre, empresa, tipo_persona, telefono, correo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [documento, nombre, empresa, tipo_persona, telefono || null, correo]
    );
    return { id: result.insertId, isNew: true };
  },
};

module.exports = Visitor;
