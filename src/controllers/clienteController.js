const clienteModel = require('../models/clienteModel');

// GET /api/clientes
const listarClientes = async (req, res) => {
    try {
        const clientes = await clienteModel.obtenerClientes();
        res.status(200).json({ exito: true, datos: clientes });
    } catch (error) {
        console.error('Error al listar clientes:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener los clientes' });
    }
};

// GET /api/clientes/:id
const obtenerCliente = async (req, res) => {
    const { id } = req.params;
    try {
        const cliente = await clienteModel.obtenerClientePorId(id);
        if (!cliente) {
            return res.status(404).json({ exito: false, mensaje: 'Cliente no encontrado' });
        }
        res.status(200).json({ exito: true, datos: cliente });
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener el cliente' });
    }
};

// POST /api/clientes
const crearCliente = async (req, res) => {
    const {
        nombre, telefono, correo, nit_dpi,
        tipo_papel_preferido, diseno_frecuente,
        tipo_cliente, descuento_porcentaje, id_usuario_asignado
    } = req.body;

    if (!nombre) {
        return res.status(400).json({ exito: false, mensaje: 'El nombre del cliente es obligatorio' });
    }

    // Validar tipo_cliente si viene
    const tiposValidos = ['Regular', 'Frecuente', 'Preferencial', 'VIP'];
    if (tipo_cliente && !tiposValidos.includes(tipo_cliente)) {
        return res.status(400).json({
            exito: false,
            mensaje: `Tipo de cliente inválido. Debe ser: ${tiposValidos.join(', ')}`
        });
    }

    try {
        const nuevoId = await clienteModel.crearCliente({
            nombre, telefono, correo, nit_dpi,
            tipo_papel_preferido, diseno_frecuente,
            tipo_cliente, descuento_porcentaje, id_usuario_asignado
        });
        res.status(201).json({
            exito: true,
            mensaje: 'Cliente registrado correctamente',
            id_cliente: nuevoId
        });
    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al registrar el cliente' });
    }
};

// PUT /api/clientes/:id
const actualizarCliente = async (req, res) => {
    const { id } = req.params;
    const {
        nombre, telefono, correo, nit_dpi,
        tipo_papel_preferido, diseno_frecuente,
        tipo_cliente, descuento_porcentaje, id_usuario_asignado
    } = req.body;

    if (!nombre) {
        return res.status(400).json({ exito: false, mensaje: 'El nombre del cliente es obligatorio' });
    }

    try {
        const actualizado = await clienteModel.actualizarCliente(id, {
            nombre, telefono, correo, nit_dpi,
            tipo_papel_preferido, diseno_frecuente,
            tipo_cliente, descuento_porcentaje, id_usuario_asignado
        });

        if (actualizado) {
            res.status(200).json({ exito: true, mensaje: 'Cliente actualizado correctamente' });
        } else {
            res.status(404).json({ exito: false, mensaje: 'Cliente no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar el cliente' });
    }
};

// DELETE /api/clientes/:id
const eliminarCliente = async (req, res) => {
    const { id } = req.params;
    try {
        const eliminado = await clienteModel.eliminarCliente(id);
        if (eliminado) {
            res.status(200).json({ exito: true, mensaje: 'Cliente eliminado correctamente' });
        } else {
            res.status(404).json({ exito: false, mensaje: 'Cliente no encontrado' });
        }
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al eliminar el cliente' });
    }
};

module.exports = {
    listarClientes,
    obtenerCliente,
    crearCliente,
    actualizarCliente,
    eliminarCliente
};