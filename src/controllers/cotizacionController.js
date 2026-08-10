const cotizacionModel = require('../models/cotizacionModel');
const clienteModel    = require('../models/clienteModel');
const produccionModel = require('../models/produccionModel');

const listarCotizaciones = async (req, res) => {
    try {
        const cotizaciones = await cotizacionModel.obtenerCotizaciones();
        res.status(200).json({ exito: true, datos: cotizaciones });
    } catch (error) {
        console.error('Error al listar cotizaciones:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener las cotizaciones' });
    }
};

const obtenerCotizacion = async (req, res) => {
    const { id } = req.params;
    try {
        const cotizacion = await cotizacionModel.obtenerCotizacionPorId(id);
        if (!cotizacion) return res.status(404).json({ exito: false, mensaje: 'Cotización no encontrada' });
        res.status(200).json({ exito: true, datos: cotizacion });
    } catch (error) {
        console.error('Error al obtener cotización:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener la cotización' });
    }
};

const listarPorCliente = async (req, res) => {
    const { id_cliente } = req.params;
    try {
        const cotizaciones = await cotizacionModel.obtenerCotizacionesPorCliente(id_cliente);
        res.status(200).json({ exito: true, datos: cotizaciones });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al obtener cotizaciones del cliente' });
    }
};

// Retorna todo el catálogo de insumos y precios de manera unificada (Optimiza peticiones HTTP)
const obtenerCatalogo = async (req, res) => {
    try {
        const [preciosBase, insumos, maquinas] = await Promise.all([
            cotizacionModel.obtenerPreciosBase(),
            cotizacionModel.obtenerInsumos(),
            cotizacionModel.obtenerMaquinas()
        ]);
        res.status(200).json({ exito: true, datos: { preciosBase, insumos, maquinas } });
    } catch (error) {
        console.error('Error al obtener catálogo:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al cargar catálogo' });
    }
};

// Crear cotización: Identifica si es un cliente existente o ejecuta un alta de nuevo cliente primero
const crearCotizacion = async (req, res) => {
    const { id_cliente, cliente_nuevo, detalle } = req.body;

    if (!detalle || !Array.isArray(detalle) || detalle.length === 0) {
        return res.status(400).json({ exito: false, mensaje: 'Debe incluir al menos un detalle' });
    }

    for (const item of detalle) {
        if (!item.tipo_trabajo || !item.cantidad || item.subtotal === undefined) {
            return res.status(400).json({ exito: false, mensaje: 'Cada detalle necesita: tipo_trabajo, cantidad y subtotal' });
        }
    }

    try {
        const id_usuario = req.usuario.id_usuario; 
        let clienteId = id_cliente;

        // Flujo condicional: Si se llenaron los campos de "Cliente Nuevo", se registra antes de la cotización
        if (cliente_nuevo && cliente_nuevo.nombre) {
            clienteId = await clienteModel.crearCliente({
                nombre:               cliente_nuevo.nombre,
                telefono:             cliente_nuevo.telefono || null,
                correo:               cliente_nuevo.correo || null,
                nit_dpi:              cliente_nuevo.nit_dpi || null,
                tipo_papel_preferido: cliente_nuevo.tipo_papel_preferido || null,
                diseno_frecuente:     cliente_nuevo.diseno_frecuente || null,
                tipo_cliente:         'Regular', // Valor inicial por defecto
                descuento_porcentaje: 0,
                id_usuario_asignado:  id_usuario
            });
        }

        if (!clienteId) {
            return res.status(400).json({ exito: false, mensaje: 'Debes seleccionar un cliente o ingresar uno nuevo' });
        }

        const id_cotizacion = await cotizacionModel.crearCotizacion(
            { id_cliente: clienteId, id_usuario },
            detalle
        );

        res.status(201).json({
            exito: true,
            mensaje: 'Cotización creada correctamente',
            id_cotizacion,
            id_cliente: clienteId
        });
    } catch (error) {
        console.error('Error al crear cotización:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al crear la cotización' });
    }
};

// Cambiar estado y gatillar ascenso de nivel si la cotización pasa a "Aceptada"
const cambiarEstado = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    const estadosValidos = ['Pendiente', 'Aceptada', 'Rechazada'];

    if (!estado || !estadosValidos.includes(estado)) {
        return res.status(400).json({ exito: false, mensaje: `Estado inválido. Debe ser: ${estadosValidos.join(', ')}` });
    }

    try {
        if (estado === 'Aceptada') {
            const validacion = await cotizacionModel.validarAceptacion(id);
            if (!validacion.ok) {
                return res.status(400).json({ exito: false, mensaje: validacion.mensaje });
            }
        }

        const actualizado = await cotizacionModel.actualizarEstado(id, estado);
        if (!actualizado) return res.status(404).json({ exito: false, mensaje: 'Cotización no encontrada' });

        // Si se acepta, recalculamos de inmediato el nivel comercial del cliente y se crea la orden de producción
        if (estado === 'Aceptada') {
            const cotizacion = await cotizacionModel.obtenerCotizacionPorId(id);
            if (cotizacion && cotizacion.id_cliente) {
                await cotizacionModel.actualizarNivelCliente(cotizacion.id_cliente);
            }
            await produccionModel.inicializarTablas();
            await produccionModel.crearDesdeCotizacion(id);
        }

        res.status(200).json({ exito: true, mensaje: `Cotización marcada como: ${estado}` });
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar el estado' });
    }
};

const eliminarCotizacion = async (req, res) => {
    const { id } = req.params;
    try {
        const eliminado = await cotizacionModel.eliminarCotizacion(id);
        if (eliminado) res.status(200).json({ exito: true, mensaje: 'Cotización eliminada' });
        else res.status(404).json({ exito: false, mensaje: 'Cotización no encontrada' });
    } catch (error) {
        console.error('Error al eliminar cotización:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al eliminar la cotización' });
    }
};

module.exports = {
    listarCotizaciones, obtenerCotizacion, listarPorCliente,
    obtenerCatalogo, crearCotizacion, cambiarEstado, eliminarCotizacion
};