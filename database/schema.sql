-- ============================================================
-- Sistema de Gestión de Entrada
-- Base de datos profesional con normalización correcta
-- ============================================================

CREATE DATABASE IF NOT EXISTS gestion_entrada
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gestion_entrada;

-- ------------------------------------------------------------
-- Tabla de visitantes frecuentes (datos permanentes)
-- Solo se crea una vez por persona, no se duplica
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visitantes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  documento     VARCHAR(30)  NOT NULL UNIQUE COMMENT 'Número de documento de identidad',
  nombre        VARCHAR(150) NOT NULL,
  empresa       VARCHAR(150) NOT NULL,
  tipo_persona  ENUM('Cliente','Visitante','Proveedor') NOT NULL DEFAULT 'Visitante',
  telefono      VARCHAR(30)  NULL,
  correo        VARCHAR(150) NOT NULL,
  creado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_documento (documento),
  INDEX idx_nombre    (nombre)
) ENGINE=InnoDB COMMENT='Registro permanente de visitantes frecuentes';

-- ------------------------------------------------------------
-- Tabla de ingresos y salidas (registros diarios)
-- Referencia al visitante para no duplicar información
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingresos (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  visitante_id    INT UNSIGNED NOT NULL,
  persona_visita  VARCHAR(150) NULL  COMMENT 'Empleado interno que recibe al visitante',
  motivo          TEXT         NULL  COMMENT 'Motivo de la visita',
  hora_entrada    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  hora_salida     DATETIME     NULL,
  estado          ENUM('Dentro','Salió') NOT NULL DEFAULT 'Dentro',
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ingresos_visitante
    FOREIGN KEY (visitante_id)
    REFERENCES visitantes (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  INDEX idx_hora_entrada  (hora_entrada),
  INDEX idx_estado        (estado),
  INDEX idx_visitante_id  (visitante_id)
) ENGINE=InnoDB COMMENT='Registro diario de entradas y salidas';

-- ------------------------------------------------------------
-- Vista útil para el dashboard y el historial
-- Combina datos del visitante con el ingreso
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW v_registros AS
  SELECT
    i.id,
    v.documento,
    v.nombre,
    v.empresa,
    v.tipo_persona,
    v.telefono,
    v.correo,
    i.persona_visita,
    i.motivo,
    i.hora_entrada,
    i.hora_salida,
    i.estado,
    i.creado_en
  FROM ingresos i
  INNER JOIN visitantes v ON v.id = i.visitante_id;
