const maquinaModel = require('../models/maquinaModel');

const listarMaquinas = async (req, res) => {
    try { res.json({ exito: true, datos: await maquinaModel.listarMaquinas() }); }
    catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al listar impresoras' }); }
};

const crearMaquina = async (req, res) => {
    const { nombre, tipo, precio_por_hora } = req.body;
    if (!nombre || !tipo || precio_por_hora === undefined || Number(precio_por_hora) < 0) {
        return res.status(400).json({ exito: false, mensaje: 'Nombre, tipo y precio por hora son obligatorios' });
    }
    try {
        const id_maquina = await maquinaModel.crearMaquina(nombre, tipo, Number(precio_por_hora));
        res.status(201).json({ exito: true, id_maquina, mensaje: 'Impresora creada correctamente' });
    } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al crear impresora' }); }
};

const actualizarMaquina = async (req, res) => {
    const { nombre, tipo, precio_por_hora } = req.body;
    try {
        const actualizado = await maquinaModel.actualizarMaquina(req.params.id, nombre, tipo, Number(precio_por_hora));
        res.status(actualizado ? 200 : 404).json({ exito: actualizado, mensaje: actualizado ? 'Impresora actualizada' : 'Impresora no encontrada' });
    } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error al actualizar impresora' }); }
};

const cambiarEstadoMaquina = async (req, res) => {
    const estados = ['Disponible', 'Mantenimiento'];
    if (!estados.includes(req.body.estado)) return res.status(400).json({ exito: false, mensaje: 'Estado inválido' });
    try {
        const maquinas = await maquinaModel.listarMaquinas();
        const maquina = maquinas.find(item => item.id_maquina === Number(req.params.id));
        if (!maquina) return res.status(404).json({ exito: false, mensaje: 'Impresora no encontrada' });
        if (maquina.estado === 'En uso' && req.body.estado === 'Mantenimiento') {
            return res.status(409).json({ exito: false, mensaje: 'No se puede deshabilitar una impresora en uso' });
        }
        const actualizado = await maquinaModel.cambiarEstadoMaquina(req.params.id, req.body.estado);
        res.status(actualizado ? 200 : 404).json({ exito: actualizado, mensaje: actualizado ? 'Estado de impresora actualizado' : 'Impresora no encontrada' });
    } catch (error) { res.status(409).json({ exito: false, mensaje: 'No se puede deshabilitar una impresora en uso' }); }
};

module.exports = { listarMaquinas, crearMaquina, actualizarMaquina, cambiarEstadoMaquina };