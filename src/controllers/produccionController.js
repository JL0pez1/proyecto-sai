const produccionModel = require('../models/produccionModel');
const db = require('../config/db');

const listarProduccion = async (req, res) => {
    try {
        await produccionModel.inicializarTablas();
        const datos = await produccionModel.listarProduccion();
        res.status(200).json({ exito: true, datos });
    } catch (error) {
        console.error('Error al listar producción:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al cargar producción' });
    }
};

const obtenerProduccion = async (req, res) => {
    try {
        await produccionModel.inicializarTablas();
        const orden = await produccionModel.obtenerProduccionPorId(req.params.id);
        if (!orden) return res.status(404).json({ exito: false, mensaje: 'Orden no encontrada' });
        const comentarios = await produccionModel.listarComentarios(req.params.id);
        res.status(200).json({ exito: true, datos: { ...orden, comentarios } });
    } catch (error) {
        console.error('Error al obtener producción:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al cargar orden de producción' });
    }
};

const crearDesdeCotizacion = async (req, res) => {
    try {
        await produccionModel.inicializarTablas();
        const id_orden = await produccionModel.crearDesdeCotizacion(req.params.id);
        if (!id_orden) return res.status(404).json({ exito: false, mensaje: 'Cotización no encontrada' });
        res.status(201).json({ exito: true, id_orden });
    } catch (error) {
        console.error('Error al crear orden:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al crear orden de producción' });
    }
};

const cambiarEstado = async (req, res) => {
    try {
        await produccionModel.inicializarTablas();
        const exito = await produccionModel.actualizarEstadoProduccion(req.params.id, req.body.estado, req.body);
        if (!exito) return res.status(404).json({ exito: false, mensaje: 'Orden no encontrada' });
        res.status(200).json({ exito: true, mensaje: 'Estado actualizado' });
    } catch (error) {
        console.error('Error al cambiar estado de producción:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar estado' });
    }
};

const agregarComentario = async (req, res) => {
    try {
        await produccionModel.inicializarTablas();
        const exito = await produccionModel.agregarComentario(req.params.id, req.usuario.id_usuario, req.body.mensaje);
        if (!exito) return res.status(400).json({ exito: false, mensaje: 'No se pudo guardar el comentario' });
        const [destinatarios] = await db.query(
            `SELECT id_usuario FROM usuarios WHERE estado = 'Activo' AND id_usuario <> ?`,
            [req.usuario.id_usuario]
        );
        for (const destinatario of destinatarios) {
            await db.query(
                `INSERT INTO notificaciones (id_usuario_destino, id_orden, mensaje) VALUES (?, ?, ?)`,
                [destinatario.id_usuario, req.params.id, `Nuevo comentario en la orden #${req.params.id}.`]
            );
        }
        res.status(201).json({ exito: true, mensaje: 'Comentario agregado', info: 'Notificación enviada al equipo correspondiente' });
    } catch (error) {
        console.error('Error al agregar comentario:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al guardar comentario' });
    }
};

module.exports = {
    listarProduccion,
    obtenerProduccion,
    crearDesdeCotizacion,
    cambiarEstado,
    agregarComentario
};
