"use strict";

const { Router } = require("express");
const entriesController = require("../controllers/entriesController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = Router();

// Todos los endpoints requieren autenticación
router.use(requireAuth);

// Historial y exportar → solo Administrador

router.get("/active", entriesController.getActive);
router.get("/history", requireAdmin, entriesController.getHistory);
router.get("/export", requireAdmin, entriesController.exportToExcel);

// Eliminar registro → solo Administrador
router.delete("/:id", requireAdmin, entriesController.deleteEntry);

// Registrar entrada y salida → cualquier usuario autenticado
router.post("/", entriesController.registerEntry);
router.put("/:id/exit", entriesController.registerExit);

module.exports = router;
