const insumoModel = require('../models/insumoModel');

const listarInsumos = async (req, res) => {
    try {
        const insumos = await insumoModel.obtenerInsumos();
        res.status(200).json({ exito: true, datos: insumos });
    } catch (error) {
        console.error('Error al listar insumos:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener los insumos' });
    }
};

const crearInsumo = async (req, res) => {
    const { nombre, categoria, costo_unitario, precio_venta } = req.body;

    // Validación básica
    if (!nombre || !categoria || !costo_unitario || !precio_venta) {
        return res.status(400).json({ exito: false, mensaje: 'Todos los campos son obligatorios' });
    }

    try {
        const nuevoId = await insumoModel.crearInsumo(nombre, categoria, costo_unitario, precio_venta);
        res.status(201).json({ exito: true, mensaje: 'Insumo creado correctamente', id_insumo: nuevoId });
    } catch (error) {
        console.error('Error al crear insumo:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al crear el insumo' });
    }
};

const actualizarInsumo = async (req, res) => {
    const { id } = req.params;
    const { nombre, categoria, costo_unitario, precio_venta } = req.body;

    try {
        const actualizado = await insumoModel.actualizarInsumo(id, nombre, categoria, costo_unitario, precio_venta);
        if (actualizado) {
            res.status(200).json({ exito: true, mensaje: 'Insumo actualizado correctamente' });
        } else {
            res.status(404).json({ exito: false, mensaje: 'Insumo no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar insumo:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar el insumo' });
    }
};

module.exports = {
    listarInsumos,
    crearInsumo,
    actualizarInsumo
};