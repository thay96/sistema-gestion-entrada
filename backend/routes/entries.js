"use strict";

const { Router } = require("express");
const entriesController = require("../controllers/entriesController");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = Router();

// Todos los endpoints requieren autenticación
router.use(requireAuth);

// Historial y exportación → cualquier usuario autenticado (Administrador o Recepción)

router.get("/active", entriesController.getActive);
router.get("/history", entriesController.getHistory);
router.get("/export", entriesController.exportToExcel);
router.get("/evacuation", entriesController.getEvacuationList);

// Eliminar registro → solo Administrador
router.delete("/:id", requireAdmin, entriesController.deleteEntry);

// Registrar entrada y salida → cualquier usuario autenticado
router.post("/", upload.single('foto'), entriesController.registerEntry);
router.put("/:id/exit", entriesController.registerExit);

module.exports = router;
