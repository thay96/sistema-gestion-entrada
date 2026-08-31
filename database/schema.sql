-- 1. Destruir la base de datos vieja con todo su contenido
DROP DATABASE IF EXISTS gestion_entrada;

-- 2. Crear la base de datos limpia
CREATE DATABASE gestion_entrada CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gestion_entrada;

-- 3. Crear Tabla Visitantes
CREATE TABLE visitantes (
   id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
   documento      VARCHAR(30)  NOT NULL UNIQUE,
   nombre         VARCHAR(150) NOT NULL,
   empresa        VARCHAR(150) NOT NULL,
   tipo_persona   ENUM('Cliente','Visitante','Proveedor') NOT NULL DEFAULT 'Visitante',
   telefono       VARCHAR(30)  NULL,
   correo         VARCHAR(150) NOT NULL,
   creado_en      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
   actualizado_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   INDEX idx_documento (documento),
   INDEX idx_nombre    (nombre),
   INDEX idx_empresa   (empresa)
) ENGINE=InnoDB;

-- 4. Crear Tabla Ingresos (sin la columna persona_visita, se eliminó del sistema)
CREATE TABLE ingresos (
   id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
   visitante_id   INT UNSIGNED NOT NULL,
   motivo         TEXT         NULL,
   hora_entrada   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
   hora_salida    DATETIME     NULL,
   estado         ENUM('Dentro','Salió') NOT NULL DEFAULT 'Dentro',
   creado_en      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
   CONSTRAINT fk_ingresos_visitante FOREIGN KEY (visitante_id) REFERENCES visitantes (id) ON UPDATE CASCADE ON DELETE RESTRICT,
   INDEX idx_hora_entrada (hora_entrada),
   INDEX idx_estado       (estado),
   INDEX idx_visitante_id (visitante_id)
) ENGINE=InnoDB;

-- 5. Crear Tabla Usuarios
CREATE TABLE usuarios (
   id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
   nombre         VARCHAR(100) NOT NULL,
   usuario        VARCHAR(50)  NOT NULL UNIQUE,
   password       VARCHAR(255) NOT NULL,
   rol            ENUM('Administrador','Recepcion') NOT NULL DEFAULT 'Recepcion',
   activo         TINYINT(1)   NOT NULL DEFAULT 1,
   creado_en      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
   actualizado_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   INDEX idx_usuario (usuario),
   INDEX idx_rol     (rol),
   INDEX idx_activo  (activo)
) ENGINE=InnoDB;

-- 6. Crear Vista (sin persona_visita)
CREATE OR REPLACE VIEW v_registros AS
SELECT 
  i.id,
  v.documento,
  v.nombre,
  v.empresa,
  v.tipo_persona,
  v.telefono,
  v.correo,
  i.motivo,
  i.hora_entrada,
  i.hora_salida,
  i.estado,
  i.creado_en
FROM ingresos i
INNER JOIN visitantes v ON v.id = i.visitante_id;