const express = require('express');
const router = express.Router();
const produccionController = require('../controllers/produccionController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Permisos específicos para Producción:
// - Ver: Administrador (1), Ventas/Recepción (2) y Producción (3)
// - Editar/Acciones: Administrador (1) y Producción (3)
const permisoProduccionView = (req, res, next) => {
	const id_rol = req.usuario && req.usuario.id_rol;
	if ([1,2,3].includes(parseInt(id_rol))) return next();
	return res.status(403).json({ exito: false, mensaje: 'No tienes permiso para ver Producción' });
};

const permisoProduccionEdit = (req, res, next) => {
	const id_rol = req.usuario && req.usuario.id_rol;
	if ([1,3].includes(parseInt(id_rol))) return next();
	return res.status(403).json({ exito: false, mensaje: 'No tienes permiso para modificar Producción' });
};

router.get('/', verificarToken, permisoProduccionView, produccionController.listarProduccion);
router.get('/:id', verificarToken, permisoProduccionView, produccionController.obtenerProduccion);
router.post('/cotizacion/:id', verificarToken, permisoProduccionEdit, produccionController.crearDesdeCotizacion);
router.patch('/:id/estado', verificarToken, permisoProduccionEdit, produccionController.cambiarEstado);
router.post('/:id/comentarios', verificarToken, permisoProduccionView, produccionController.agregarComentario);

module.exports = router;
