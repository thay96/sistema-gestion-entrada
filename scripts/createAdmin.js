'use strict';

/**
 * Script de configuración inicial.
 * Crea o restablece el usuario administrador con un hash bcrypt correcto.
 *
 * Uso:
 *   node scripts/createAdmin.js
 *   node scripts/createAdmin.js --usuario=admin --password=MiPassword123
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool, testConnection } = require('../backend/config/db');

// Leer argumentos opcionales --usuario= y --password=
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => a.replace('--', '').split('='))
);

const USUARIO  = args.usuario  || 'admin';
const PASSWORD = args.password || 'Admin1234';
const NOMBRE   = args.nombre   || 'Administrador';

async function run() {
  await testConnection();

  const hash = await bcrypt.hash(PASSWORD, 12);

  await pool.execute(
    `INSERT INTO usuarios (nombre, usuario, password, rol, activo)
     VALUES (?, ?, ?, 'Administrador', 1)
     ON DUPLICATE KEY UPDATE
       nombre   = VALUES(nombre),
       password = VALUES(password),
       rol      = 'Administrador',
       activo   = 1`,
    [NOMBRE, USUARIO, hash]
  );

  console.log('');
  console.log('✅  Usuario administrador configurado correctamente.');
  console.log(`    Usuario  : ${USUARIO}`);
  console.log(`    Contraseña: ${PASSWORD}`);
  console.log('');
  console.log('⚠️   Cambie la contraseña después del primer inicio de sesión.');
  console.log('');

  await pool.end();
}

run().catch(err => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
