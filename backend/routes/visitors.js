'use strict';

const { Router }         = require('express');
const visitorsController = require('../controllers/visitorsController');
const { requireAuth }    = require('../middleware/auth');

const router = Router();

// Todos los endpoints requieren autenticación
router.use(requireAuth);

// Buscar visitante por documento (auto-completar)
router.get('/lookup', visitorsController.lookup);

// Buscar visitantes activos por nombre o documento (pantalla salida)
router.get('/search', visitorsController.search);

module.exports = router;
