const reporteModel = require('../models/reporteModel');

const obtenerReporte = async (req, res) => {
    try {
        const datos = await reporteModel.listarReporte({
            inicio: req.query.inicio,
            fin: req.query.fin,
            periodo: req.query.periodo
        });
        res.json({ exito: true, datos });
    } catch (error) {
        console.error('Error al generar reporte:', error);
        res.status(500).json({ exito: false, mensaje: 'No fue posible generar el reporte' });
    }
};

module.exports = { obtenerReporte };
