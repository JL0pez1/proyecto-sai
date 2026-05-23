const db = require('../config/db');

// Obtener todas las cotizaciones con info de cliente y usuario
const obtenerCotizaciones = async () => {
    const [rows] = await db.query(`
        SELECT 
            c.id_cotizacion,
            c.fecha_emision,
            c.estado,
            c.total,
            c.ruta_pdf,
            cl.nombre AS nombre_cliente,
            cl.correo AS correo_cliente,
            cl.tipo_cliente,
            u.nombre_completo AS nombre_usuario
        FROM cotizaciones c
        LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
        LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
        ORDER BY c.fecha_emision DESC
    `);
    return rows;
};

// Obtener una cotización por ID con su detalle completo
const obtenerCotizacionPorId = async (id) => {
    // Datos de la cotización
    const [cotRows] = await db.query(`
        SELECT 
            c.*,
            cl.nombre AS nombre_cliente,
            cl.telefono AS telefono_cliente,
            cl.correo AS correo_cliente,
            cl.nit_dpi,
            cl.tipo_cliente,
            cl.descuento_porcentaje,
            u.nombre_completo AS nombre_usuario
        FROM cotizaciones c
        LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
        LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
        WHERE c.id_cotizacion = ?
    `, [id]);

    if (cotRows.length === 0) return null;

    // Detalle de la cotización
    const [detalleRows] = await db.query(`
        SELECT 
            d.*,
            p.nombre AS nombre_papel,
            a.nombre AS nombre_acabado
        FROM detalle_cotizaciones d
        LEFT JOIN papeles p ON d.id_papel = p.id_papel
        LEFT JOIN acabados a ON d.id_acabado = a.id_acabado
        WHERE d.id_cotizacion = ?
    `, [id]);

    return {
        ...cotRows[0],
        detalle: detalleRows
    };
};

// Obtener cotizaciones por cliente
const obtenerCotizacionesPorCliente = async (id_cliente) => {
    const [rows] = await db.query(`
        SELECT 
            c.*,
            u.nombre_completo AS nombre_usuario
        FROM cotizaciones c
        LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
        WHERE c.id_cliente = ?
        ORDER BY c.fecha_emision DESC
    `, [id_cliente]);
    return rows;
};

// Crear cotización con su detalle (transacción)
const crearCotizacion = async (cotizacion, detalle) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Insertar la cotización
        const [cotResult] = await connection.query(`
            INSERT INTO cotizaciones (id_cliente, id_usuario, estado, total)
            VALUES (?, ?, 'Pendiente', ?)
        `, [cotizacion.id_cliente, cotizacion.id_usuario, cotizacion.total || 0]);

        const id_cotizacion = cotResult.insertId;

        // 2. Insertar cada línea del detalle
        if (detalle && detalle.length > 0) {
            for (const item of detalle) {
                await connection.query(`
                    INSERT INTO detalle_cotizaciones 
                        (id_cotizacion, tipo_trabajo, cantidad, tamano, id_papel, id_acabado,
                         consumo_estimado_tinta, tiempo_estimado_maquina, subtotal)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    id_cotizacion,
                    item.tipo_trabajo,
                    item.cantidad,
                    item.tamano || null,
                    item.id_papel || null,
                    item.id_acabado || null,
                    item.consumo_estimado_tinta || null,
                    item.tiempo_estimado_maquina || null,
                    item.subtotal
                ]);
            }

            // 3. Actualizar el total sumando los subtotales del detalle
            await connection.query(`
                UPDATE cotizaciones 
                SET total = (SELECT SUM(subtotal) FROM detalle_cotizaciones WHERE id_cotizacion = ?)
                WHERE id_cotizacion = ?
            `, [id_cotizacion, id_cotizacion]);
        }

        await connection.commit();
        return id_cotizacion;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// Actualizar estado de cotización (Pendiente → Aceptada / Rechazada)
const actualizarEstado = async (id, estado) => {
    const estadosValidos = ['Pendiente', 'Aceptada', 'Rechazada'];
    if (!estadosValidos.includes(estado)) {
        throw new Error('Estado inválido');
    }
    const [result] = await db.query(
        'UPDATE cotizaciones SET estado = ? WHERE id_cotizacion = ?',
        [estado, id]
    );
    return result.affectedRows > 0;
};

// Guardar ruta del PDF generado
const guardarRutaPdf = async (id, ruta_pdf) => {
    const [result] = await db.query(
        'UPDATE cotizaciones SET ruta_pdf = ? WHERE id_cotizacion = ?',
        [ruta_pdf, id]
    );
    return result.affectedRows > 0;
};

// Eliminar cotización (también elimina el detalle por FK CASCADE, o manualmente)
const eliminarCotizacion = async (id) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('DELETE FROM detalle_cotizaciones WHERE id_cotizacion = ?', [id]);
        const [result] = await connection.query('DELETE FROM cotizaciones WHERE id_cotizacion = ?', [id]);
        await connection.commit();
        return result.affectedRows > 0;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    obtenerCotizaciones,
    obtenerCotizacionPorId,
    obtenerCotizacionesPorCliente,
    crearCotizacion,
    actualizarEstado,
    guardarRutaPdf,
    eliminarCotizacion
};