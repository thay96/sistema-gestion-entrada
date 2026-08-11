"use strict";

const User = require("../models/User");
const { generateToken } = require("../middleware/auth");

/**
 * Controlador de Autenticación.
 */
const authController = {
  /**
   * POST /api/auth/login
   * Valida credenciales y retorna un JWT.
   */
  async login(req, res) {
    try {
      const { usuario, password } = req.body;

      console.log("Usuario:", usuario);
      console.log("Password:", password);

      if (!usuario || !password) {
        return res.status(400).json({
          success: false,
          message: "El usuario y la contraseña son obligatorios.",
        });
      }

      const user = await User.findByUsername(usuario.trim().toLowerCase());

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Usuario o contraseña incorrectos.",
        });
      }

      console.log("Hash:", user.password);

      const valid = await User.verifyPassword(password, user.password);

      console.log("¿Contraseña correcta?", valid);

      if (!valid) {
        return res.status(401).json({
          success: false,
          message: "Usuario o contraseña incorrectos.",
        });
      }

      const token = generateToken(user);

      return res.json({
        success: true,
        message: `Bienvenido, ${user.nombre}.`,
        token,
        user: {
          id: user.id,
          nombre: user.nombre,
          usuario: user.usuario,
          rol: user.rol,
        },
      });
    } catch (err) {
      console.error("[authController.login]", err);
      return res
        .status(500)
        .json({ success: false, message: "Error interno del servidor." });
    }
  },

  /**
   * GET /api/auth/me
   * Retorna los datos del usuario autenticado (requiere JWT válido).
   */
  async me(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Usuario no encontrado." });
      }
      return res.json({ success: true, user });
    } catch (err) {
      console.error("[authController.me]", err);
      return res
        .status(500)
        .json({ success: false, message: "Error interno del servidor." });
    }
  },
};

module.exports = authController;
