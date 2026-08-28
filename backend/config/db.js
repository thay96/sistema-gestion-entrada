'use strict';

const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Pool de conexiones a MySQL.
 * El pool reutiliza conexiones existentes en lugar de crear una nueva
 * por cada consulta, mejorando el rendimiento considerablemente.
 */
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'defaultdb',
  charset:            'utf8mb4',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           'local',
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Verifica la conexión con la base de datos al iniciar el servidor.
 * Lanza un error fatal si no se puede establecer la conexión.
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅  Conexión a MySQL establecida correctamente.');
    connection.release();
  } catch (err) {
    console.error('❌  No se pudo conectar a MySQL:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
