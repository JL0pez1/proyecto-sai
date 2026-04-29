const clienteModel = require('../models/clienteModel');

const listarClientes = async (req, res) => {
    try {
        const clientes = await clienteModel.obtenerClientes();
        res.status(200).json({ exito: true, datos: clientes });
    } catch (error) {
        console.error('Error al listar clientes:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener los clientes' });
    }
};

const crearCliente = async (req, res) => {
    const { nombre, telefono, correo, nit_dpi, tipo_papel_preferido, diseno_frecuente } = req.body;

    if (!nombre) {
        return res.status(400).json({ exito: false, mensaje: 'El nombre del cliente es obligatorio' });
    }

    try {
        const nuevoId = await clienteModel.crearCliente(
            nombre, telefono, correo, nit_dpi, tipo_papel_preferido, diseno_frecuente
        );
        res.status(201).json({ exito: true, mensaje: 'Cliente registrado correctamente', id_cliente: nuevoId });
    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al registrar el cliente' });
    }
};

const actualizarCliente = async (req, res) => {
    const { id } = req.params;
    const { nombre, telefono, correo, nit_dpi, tipo_papel_preferido, diseno_frecuente } = req.body;

    try {
        const actualizado = await clienteModel.actualizarCliente(
            id, nombre, telefono, correo, nit_dpi, tipo_papel_preferido, diseno_frecuente
        );
        
        if (actualizado) {
            res.status(200).json({ exito: true, mensaje: 'Datos del cliente actualizados' });
        } else {
            res.status(404).json({ exito: false, mensaje: 'Cliente no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar el cliente' });
    }
};

module.exports = {
    listarClientes,
    crearCliente,
    actualizarCliente
};