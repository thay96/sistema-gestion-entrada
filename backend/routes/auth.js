'use strict';

const { Router }    = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// Login público (no requiere token)
router.post('/login', authController.login);

// Datos del usuario autenticado (requiere token)
router.get('/me', requireAuth, authController.me);

module.exports = router;
