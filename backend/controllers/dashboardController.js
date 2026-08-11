'use strict';

const { pool } = require('../config/db');

/**
 * Controlador del Dashboard.
 * Retorna estadísticas ampliadas del día incluyendo desglose por tipo.
 */
const dashboardController = {

  async getStats(req, res) {
    try {
      // Estadísticas del día con desglose por tipo de persona
      const [statsRows] = await pool.execute(`
        SELECT
          SUM(i.estado = 'Dentro')                              AS dentro,
          SUM(i.estado = 'Salió')                               AS salidos,
          COUNT(*)                                              AS total_ingresos,
          SUM(i.hora_salida IS NOT NULL)                        AS total_salidas,
          COUNT(DISTINCT v.empresa)                             AS total_empresas,
          SUM(v.tipo_persona = 'Proveedor')                     AS proveedores,
          SUM(v.tipo_persona = 'Cliente')                       AS clientes,
          SUM(v.tipo_persona = 'Visitante')                     AS visitantes_tipo
        FROM ingresos i
        INNER JOIN visitantes v ON v.id = i.visitante_id
        WHERE DATE(i.hora_entrada) = CURDATE()
      `);

      // Registros del día para la tabla principal
      const [records] = await pool.execute(`
        SELECT
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
        ORDER BY i.hora_entrada DESC
      `);

      const s = statsRows[0];

      return res.json({
        success: true,
        stats: {
          dentro:          Number(s.dentro)          || 0,
          salidos:         Number(s.salidos)         || 0,
          total_ingresos:  Number(s.total_ingresos)  || 0,
          total_salidas:   Number(s.total_salidas)   || 0,
          total_empresas:  Number(s.total_empresas)  || 0,
          proveedores:     Number(s.proveedores)     || 0,
          clientes:        Number(s.clientes)        || 0,
          visitantes_tipo: Number(s.visitantes_tipo) || 0,
        },
        records,
      });
    } catch (err) {
      console.error('[dashboardController.getStats]', err);
      return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  },
};

module.exports = dashboardController;
