const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/rolMiddleware');

// Todas las rutas requieren token + permiso 'clientes'
router.get('/', verificarToken, verificarPermiso('clientes'), clienteController.listarClientes);
router.get('/:id', verificarToken, verificarPermiso('clientes'), clienteController.obtenerCliente);
router.post('/', verificarToken, verificarPermiso('clientes'), clienteController.crearCliente);
router.put('/:id', verificarToken, verificarPermiso('clientes'), clienteController.actualizarCliente);
router.delete('/:id', verificarToken, verificarPermiso('clientes'), clienteController.eliminarCliente);

module.exports = router;