-- ============================================================
-- Actualizaciones del esquema — CONEQUIPOS
-- Ejecutar sobre la base de datos existente
-- ============================================================

USE gestion_entrada;

-- ------------------------------------------------------------
-- Tabla de usuarios del sistema (Login + Roles)
-- Las contraseñas se almacenan como hash bcrypt
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100)  NOT NULL COMMENT 'Nombre completo del usuario',
  usuario     VARCHAR(50)   NOT NULL UNIQUE COMMENT 'Username para login',
  password    VARCHAR(255)  NOT NULL COMMENT 'Hash bcrypt de la contraseña',
  rol         ENUM('Administrador','Operador') NOT NULL DEFAULT 'Operador',
  activo      TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_usuario (usuario),
  INDEX idx_rol     (rol),
  INDEX idx_activo  (activo)
) ENGINE=InnoDB COMMENT='Usuarios del sistema con roles';

-- ------------------------------------------------------------
-- Índices de rendimiento adicionales para búsquedas
-- Se usan IF NOT EXISTS para que el script sea idempotente
-- ------------------------------------------------------------

-- visitantes
CREATE INDEX idx_empresa ON visitantes (empresa);
CREATE INDEX idx_tipo_persona   ON visitantes (tipo_persona);

-- ingresos
CREATE INDEX idx_fecha_entrada  ON ingresos (hora_entrada);
CREATE INDEX idx_estado_fecha   ON ingresos (estado, hora_entrada);

-- Índice compuesto para el historial con filtros de fecha
CREATE INDEX idx_entrada_visitante ON ingresos (visitante_id, hora_entrada);

-- ------------------------------------------------------------
-- Usuario administrador por defecto
-- password: Admin1234   (hash bcrypt)
-- CAMBIAR INMEDIATAMENTE después de la instalación
-- ------------------------------------------------------------
INSERT IGNORE INTO usuarios (nombre, usuario, password, rol)
VALUES (
  'Administrador',
  'admin',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhNhjwd.1FCZdMp/HoJIfy',
  'Administrador'
);
