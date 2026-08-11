'use strict';

const { Router }          = require('express');
const dashboardController = require('../controllers/dashboardController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

// Dashboard solo para Administrador
router.get('/', requireAuth, requireAdmin, dashboardController.getStats);

module.exports = router;
