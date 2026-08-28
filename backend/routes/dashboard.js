'use strict';

const { Router }          = require('express');
const dashboardController = require('../controllers/dashboardController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

// Dashboard: accesible para cualquier usuario autenticado (Admin y Recepcion)
router.get('/', requireAuth, dashboardController.getStats);

module.exports = router;
