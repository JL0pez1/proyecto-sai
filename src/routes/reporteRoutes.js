const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');
const { verificarToken } = require('../middlewares/authMiddleware');

const soloAdministrador = (req, res, next) => {
    if (Number(req.usuario?.id_rol) !== 1) {
        return res.status(403).json({ exito: false, mensaje: 'Solo los administradores pueden consultar reportes' });
    }
    next();
};

router.get('/', verificarToken, soloAdministrador, reporteController.obtenerReporte);

module.exports = router;
