const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verificarToken } = require('../middlewares/authMiddleware'); // ¡Aquí sí importamos el token!

// Rutas protegidas (todas necesitan verificarToken)
router.get('/', verificarToken, userController.listarUsuarios);
router.put('/:id', verificarToken, userController.actualizarUsuario);
router.patch('/:id/estado', verificarToken, userController.desactivarUsuario);
router.patch('/:id/password', verificarToken, userController.reiniciarPassword);

module.exports = router;