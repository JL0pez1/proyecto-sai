const express = require('express');
const router = express.Router();
const controller = require('../controllers/maquinaController');
const { verificarToken } = require('../middlewares/authMiddleware');

const soloAdministrador = (req, res, next) => {
    if (parseInt(req.usuario?.id_rol) === 1) return next();
    return res.status(403).json({ exito: false, mensaje: 'Solo Administradores pueden gestionar impresoras' });
};

router.use(verificarToken, soloAdministrador);
router.get('/', controller.listarMaquinas);
router.post('/', controller.crearMaquina);
router.put('/:id', controller.actualizarMaquina);
router.patch('/:id/estado', controller.cambiarEstadoMaquina);

module.exports = router;