const express = require('express');
const router = express.Router();
const insumoController = require('../controllers/insumoController');

// Rutas para el CRUD de Insumos
router.get('/', insumoController.listarInsumos);
router.post('/', insumoController.crearInsumo);
router.put('/:id', insumoController.actualizarInsumo);

module.exports = router;