const express = require('express');
const router = express.Router();
const cotizacionController = require('../controllers/cotizacionController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/rolMiddleware');

// Catálogo completo para nutrir el modal de cotización inteligente
router.get('/catalogo',            verificarToken, verificarPermiso('cotizaciones'), cotizacionController.obtenerCatalogo);

// Operaciones estándar de cotizaciones
router.get('/',                    verificarToken, verificarPermiso('cotizaciones'), cotizacionController.listarCotizaciones);
router.get('/cliente/:id_cliente', verificarToken, verificarPermiso('cotizaciones'), cotizacionController.listarPorCliente);
router.get('/:id',                 verificarToken, verificarPermiso('cotizaciones'), cotizacionController.obtenerCotizacion);
router.post('/',                   verificarToken, verificarPermiso('cotizaciones'), cotizacionController.crearCotizacion);
router.patch('/:id/estado',        verificarToken, verificarPermiso('cotizaciones'), cotizacionController.cambiarEstado);
router.delete('/:id',              verificarToken, verificarPermiso('cotizaciones'), cotizacionController.eliminarCotizacion);

module.exports = router;