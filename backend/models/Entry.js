"use strict";

const { pool } = require("../config/db");

/**
 * Modelo Entry (Ingreso).
 * Encapsula toda la lógica de acceso a la tabla `ingresos`.
 */
const Entry = {
  /**
   * Crea un nuevo registro de entrada.
   * La hora de entrada se asigna automáticamente por MySQL (DEFAULT CURRENT_TIMESTAMP).
   * @param {Object} data
   * @returns {number} ID del registro creado
   */
  async create(data) {
    const { visitante_id, persona_visita, motivo } = data;
    const [result] = await pool.execute(
      `INSERT INTO ingresos (visitante_id, persona_visita, motivo)
       VALUES (?, ?, ?)`,
      [visitante_id, persona_visita || null, motivo || null],
    );
    return result.insertId;
  },

  /**
   * Registra la hora de salida de un ingreso activo (estado = 'Dentro').
   * @param {number} ingresoId
   * @returns {boolean} true si se actualizó, false si no se encontró
   */
  async registerExit(ingresoId) {
    const [result] = await pool.execute(
      `UPDATE ingresos
       SET hora_salida = NOW(), estado = 'Salió'
       WHERE id = ? AND estado = 'Dentro'`,
      [ingresoId],
    );
    return result.affectedRows > 0;
  },

  /**
   * Busca ingresos activos (estado = 'Dentro') para un visitante.
   * Usado en la pantalla de Registrar Salida.
   * @param {string} query - Nombre o documento
   * @returns {Array}
   */
  async findActiveByQuery(query) {
    const like = `%${query}%`;
    const [rows] = await pool.execute(
      `SELECT i.id, v.nombre, v.empresa, v.documento, i.hora_entrada
       FROM ingresos i
       INNER JOIN visitantes v ON v.id = i.visitante_id
       WHERE i.estado = 'Dentro'
         AND (v.documento LIKE ? OR v.nombre LIKE ?)
       ORDER BY i.hora_entrada ASC`,
      [like, like],
    );
    return rows;
  },

  /**
   * Obtiene TODOS los ingresos activos (estado = 'Dentro'), sin filtro de búsqueda.
   * Usado para mostrar automáticamente la lista en Registrar Salida.
   * @returns {Array}
   */
  async findAllActive() {
    const [rows] = await pool.execute(
      `SELECT i.id, v.nombre, v.empresa, v.documento, i.hora_entrada
       FROM ingresos i
       INNER JOIN visitantes v ON v.id = i.visitante_id
       WHERE i.estado = 'Dentro'
       ORDER BY i.hora_entrada ASC`,
    );
    return rows;
  },

  /**
   * Obtiene las estadísticas del día actual para el dashboard.
   * @returns {Object} { dentro, salidos, total_ingresos, total_salidas }
   */
  async getDayStats() {
    const [rows] = await pool.execute(
      `SELECT
         SUM(estado = 'Dentro')  AS dentro,
         SUM(estado = 'Salió')   AS salidos,
         COUNT(*)                AS total_ingresos,
         SUM(hora_salida IS NOT NULL) AS total_salidas
       FROM ingresos
       WHERE DATE(hora_entrada) = CURDATE()`,
    );
    return rows[0];
  },

  /**
   * Obtiene todos los registros del día actual con datos del visitante.
   * Usado en la tabla principal del dashboard.
   * @returns {Array}
   */
  async getTodayRecords() {
    const [rows] = await pool.execute(
      `SELECT
         i.id,
         v.nombre,
         v.empresa,
         v.tipo_persona,
         v.documento,
         i.hora_entrada,
         i.hora_salida,
         i.estado
       FROM ingresos i
       INNER JOIN visitantes v ON v.id = i.visitante_id
       WHERE DATE(i.hora_entrada) = CURDATE()
       ORDER BY i.hora_entrada DESC`,
    );
    return rows;
  },

  /**
   * Consulta el historial con filtros opcionales de búsqueda.
   * @param {Object} filters - { query, fechaDesde, fechaHasta }
   * @returns {Array}
   */
  async getHistory(filters = {}) {
    const { query, fechaDesde, fechaHasta } = filters;
    const params = [];
    let sql = `
      SELECT
        i.id,
        v.documento,
        v.nombre,
        v.empresa,
        v.tipo_persona,
        i.persona_visita,
        i.motivo,
        i.hora_entrada,
        i.hora_salida,
        i.estado
      FROM ingresos i
      INNER JOIN visitantes v ON v.id = i.visitante_id
      WHERE 1=1
    `;

    if (query) {
      sql += " AND (v.nombre LIKE ? OR v.documento LIKE ? OR v.empresa LIKE ?)";
      const like = `%${query}%`;
      params.push(like, like, like);
    }

    if (fechaDesde) {
      sql += " AND DATE(i.hora_entrada) >= ?";
      params.push(fechaDesde);
    }

    if (fechaHasta) {
      sql += " AND DATE(i.hora_entrada) <= ?";
      params.push(fechaHasta);
    }

    sql += " ORDER BY i.hora_entrada DESC LIMIT 500";

    const [rows] = await pool.execute(sql, params);
    return rows;
  },
};

module.exports = Entry;
