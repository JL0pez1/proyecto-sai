const express = require('express');
const router = express.Router();
const insumoController = require('../controllers/insumoController');
const { verificarToken } = require('../middlewares/authMiddleware');

const soloAdministrador = (req, res, next) => {
	if (parseInt(req.usuario?.id_rol) === 1) return next();
	return res.status(403).json({ exito: false, mensaje: 'Solo Administradores pueden gestionar insumos' });
};

// Rutas para el CRUD de Insumos
router.get('/', verificarToken, soloAdministrador, insumoController.listarInsumos);
router.post('/', verificarToken, soloAdministrador, insumoController.crearInsumo);
router.put('/:id', verificarToken, soloAdministrador, insumoController.actualizarInsumo);
router.delete('/:id', verificarToken, soloAdministrador, insumoController.eliminarInsumo);

module.exports = router;