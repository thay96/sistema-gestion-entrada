'use strict';

const { Router }        = require('express');
const usersController   = require('../controllers/usersController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

// Todos los endpoints requieren autenticación + rol Administrador
router.use(requireAuth, requireAdmin);

router.get('/',                   usersController.list);
router.post('/',                  usersController.create);
router.put('/:id',                usersController.update);
router.put('/:id/password',       usersController.changePassword);
router.delete('/:id',             usersController.deactivate);

module.exports = router;
