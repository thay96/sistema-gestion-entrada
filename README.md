# Sistema de Gestión de Entrada y Salida de Visitantes

Sistema web para el control, registro y monitoreo en tiempo real del acceso de visitantes a las instalaciones de la empresa **CONEQUIPOS**.

---

## Tecnologías Utilizadas

* **Backend:** Node.js, Express.js
* **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
* **Base de Datos:** MySQL
* **Seguridad:** Authentication con JWT / Bcrypt para encriptación de contraseñas
* **Variables de Entorno:** Dotenv

---

## Características Principales

**Módulo de Autenticación:** Control de acceso seguro por roles (Administrador).
**Registro de Entradas:** Captura de datos de visitantes en tiempo real.
**Control de Salidas:** Marcación de hora de salida y estado del visitante.
**Historial y Consultas:** Filtros para revisar registros anteriores de forma rápida.
**Gestión de Usuarios:** Creación y control de acceso para el personal encargado.

---

## Instalación y Configuración Local

## 1. Requisitos Previos
* Node.js instalado (v16 o superior).
* MySQL Server y MySQL Workbench.

## 2. Clonar el Repositorio

```bash
git clone https://github.com/thay96/sistema-gestion-entrada.git
cd sistema-gestion-entrada
```

3. Instalar Dependencias

```bash
npm install
```

4. Configurar Base de Datos
Importa el archivo base de datos/schema.sql en tu servidor MySQL para crear la estructura.
Si existen actualizaciones, ejecuta base de datos/updates.sql.

5. Configurar Variables de Entorno
Crea un archivo .env en la raíz del proyecto basándote en la siguiente configuración:

```bash
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=gestion_entrada
DB_PORT=3306
```
6. Crear Usuario Administrador Inicial
Ejecuta el script para generar el administrador por defecto:

```Bash
node guiones/createAdmin.js
```

7. Iniciar la Aplicación

```Bash
npm start
```
Abre tu navegador e ingresa a http://localhost:3000.

👤 Autor
Desarrollado por thay96 - CONEQUIPOS
