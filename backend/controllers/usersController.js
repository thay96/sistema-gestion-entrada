'use strict';

const User = require('../models/User');

/**
 * Controlador de gestión de usuarios.
 * Todos los endpoints requieren rol Administrador (verificado en las rutas).
 */
const usersController = {

  /** GET /api/users — Lista todos los usuarios */
  async list(req, res) {
    try {
      const users = await User.findAll();
      return res.json({ success: true, users });
    } catch (err) {
      console.error('[usersController.list]', err);
      return res.status(500).json({ success: false, message: 'Error al obtener los usuarios.' });
    }
  },

  /** POST /api/users — Crear usuario */
  async create(req, res) {
    try {
      const { nombre, usuario, password, rol } = req.body;
      if (!nombre || !usuario || !password) {
        return res.status(400).json({ success: false, message: 'Nombre, usuario y contraseña son obligatorios.' });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
      }
      const exists = await User.usernameExists(usuario.trim().toLowerCase());
      if (exists) {
        return res.status(409).json({ success: false, message: 'Ese nombre de usuario ya está en uso.' });
      }

      const id = await User.create({
        nombre:   nombre.trim(),
        usuario:  usuario.trim().toLowerCase(),
        password,
        rol:      ['Administrador','Recepcion'].includes(rol) ? rol : 'Recepcion',
      });

      return res.status(201).json({ success: true, message: 'Usuario creado exitosamente.', id });
    } catch (err) {
      console.error('[usersController.create]', err);
      return res.status(500).json({ success: false, message: 'Error al crear el usuario.' });
    }
  },

  /** PUT /api/users/:id — Actualizar datos del usuario */
  async update(req, res) {
    try {
      const { id }                  = req.params;
      const { nombre, usuario, rol, activo } = req.body;

      if (!nombre || !usuario) {
        return res.status(400).json({ success: false, message: 'Nombre y usuario son obligatorios.' });
      }

      const exists = await User.usernameExists(usuario.trim().toLowerCase(), parseInt(id));
      if (exists) {
        return res.status(409).json({ success: false, message: 'Ese nombre de usuario ya está en uso.' });
      }

      await User.update(parseInt(id), {
        nombre:  nombre.trim(),
        usuario: usuario.trim().toLowerCase(),
        rol:     ['Administrador','Recepcion'].includes(rol) ? rol : 'Recepcion',
        activo:  activo !== undefined ? activo : 1,
      });

      return res.json({ success: true, message: 'Usuario actualizado exitosamente.' });
    } catch (err) {
      console.error('[usersController.update]', err);
      return res.status(500).json({ success: false, message: 'Error al actualizar el usuario.' });
    }
  },

  /** PUT /api/users/:id/password — Cambiar contraseña */
  async changePassword(req, res) {
    try {
      const { id }          = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
      }

      await User.changePassword(parseInt(id), newPassword);
      return res.json({ success: true, message: 'Contraseña actualizada exitosamente.' });
    } catch (err) {
      console.error('[usersController.changePassword]', err);
      return res.status(500).json({ success: false, message: 'Error al cambiar la contraseña.' });
    }
  },

  /** DELETE /api/users/:id — Desactivar usuario */
  async deactivate(req, res) {
    try {
      const { id } = req.params;
      // Proteger al usuario admin principal
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ success: false, message: 'No puede desactivar su propio usuario.' });
      }
      await User.deactivate(parseInt(id));
      return res.json({ success: true, message: 'Usuario desactivado exitosamente.' });
    } catch (err) {
      console.error('[usersController.deactivate]', err);
      return res.status(500).json({ success: false, message: 'Error al desactivar el usuario.' });
    }
  },
};

module.exports = usersController;
