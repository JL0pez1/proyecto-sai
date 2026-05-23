const cotizacionModel = require('../models/cotizacionModel');

// GET /api/cotizaciones
const listarCotizaciones = async (req, res) => {
    try {
        const cotizaciones = await cotizacionModel.obtenerCotizaciones();
        res.status(200).json({ exito: true, datos: cotizaciones });
    } catch (error) {
        console.error('Error al listar cotizaciones:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener las cotizaciones' });
    }
};

// GET /api/cotizaciones/:id
const obtenerCotizacion = async (req, res) => {
    const { id } = req.params;
    try {
        const cotizacion = await cotizacionModel.obtenerCotizacionPorId(id);
        if (!cotizacion) {
            return res.status(404).json({ exito: false, mensaje: 'Cotización no encontrada' });
        }
        res.status(200).json({ exito: true, datos: cotizacion });
    } catch (error) {
        console.error('Error al obtener cotización:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener la cotización' });
    }
};

// GET /api/cotizaciones/cliente/:id_cliente
const listarPorCliente = async (req, res) => {
    const { id_cliente } = req.params;
    try {
        const cotizaciones = await cotizacionModel.obtenerCotizacionesPorCliente(id_cliente);
        res.status(200).json({ exito: true, datos: cotizaciones });
    } catch (error) {
        console.error('Error al listar cotizaciones por cliente:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener las cotizaciones del cliente' });
    }
};

// POST /api/cotizaciones
// Body esperado:
// {
//   "id_cliente": 1,
//   "detalle": [
//     { "tipo_trabajo": "Impresión", "cantidad": 500, "tamano": "Carta", "id_papel": 1, "id_acabado": 2, "subtotal": 250.00 },
//     ...
//   ]
// }
const crearCotizacion = async (req, res) => {
    const { id_cliente, detalle } = req.body;

    if (!id_cliente) {
        return res.status(400).json({ exito: false, mensaje: 'El cliente es obligatorio' });
    }
    if (!detalle || !Array.isArray(detalle) || detalle.length === 0) {
        return res.status(400).json({ exito: false, mensaje: 'Debe incluir al menos un detalle en la cotización' });
    }

    // Validar que cada detalle tenga los campos mínimos
    for (const item of detalle) {
        if (!item.tipo_trabajo || !item.cantidad || item.subtotal === undefined) {
            return res.status(400).json({
                exito: false,
                mensaje: 'Cada detalle debe tener: tipo_trabajo, cantidad y subtotal'
            });
        }
    }

    try {
        // El usuario que crea la cotización viene del token
        const id_usuario = req.usuario.id_usuario;

        const id_cotizacion = await cotizacionModel.crearCotizacion(
            { id_cliente, id_usuario },
            detalle
        );

        res.status(201).json({
            exito: true,
            mensaje: 'Cotización creada correctamente',
            id_cotizacion
        });
    } catch (error) {
        console.error('Error al crear cotización:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al crear la cotización' });
    }
};

// PATCH /api/cotizaciones/:id/estado
// Body: { "estado": "Aceptada" | "Rechazada" | "Pendiente" }
const cambiarEstado = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = ['Pendiente', 'Aceptada', 'Rechazada'];
    if (!estado || !estadosValidos.includes(estado)) {
        return res.status(400).json({
            exito: false,
            mensaje: `Estado inválido. Debe ser: ${estadosValidos.join(', ')}`
        });
    }

    try {
        const actualizado = await cotizacionModel.actualizarEstado(id, estado);
        if (actualizado) {
            res.status(200).json({ exito: true, mensaje: `Cotización marcada como: ${estado}` });
        } else {
            res.status(404).json({ exito: false, mensaje: 'Cotización no encontrada' });
        }
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar el estado' });
    }
};

// DELETE /api/cotizaciones/:id
const eliminarCotizacion = async (req, res) => {
    const { id } = req.params;
    try {
        const eliminado = await cotizacionModel.eliminarCotizacion(id);
        if (eliminado) {
            res.status(200).json({ exito: true, mensaje: 'Cotización eliminada correctamente' });
        } else {
            res.status(404).json({ exito: false, mensaje: 'Cotización no encontrada' });
        }
    } catch (error) {
        console.error('Error al eliminar cotización:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al eliminar la cotización' });
    }
};

module.exports = {
    listarCotizaciones,
    obtenerCotizacion,
    listarPorCliente,
    crearCotizacion,
    cambiarEstado,
    eliminarCotizacion
};