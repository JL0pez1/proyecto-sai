const db = require('../config/db');

// Listar todas las cotizaciones con datos clave de clientes y creadores
const obtenerCotizaciones = async () => {
    const [rows] = await db.query(`
        SELECT c.id_cotizacion, c.fecha_emision, c.estado, c.total, c.ruta_pdf,
            cl.nombre AS nombre_cliente, cl.correo AS correo_cliente, cl.tipo_cliente,
            u.nombre_completo AS nombre_usuario
        FROM cotizaciones c
        LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
        LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
        ORDER BY c.fecha_emision DESC
    `);
    return rows;
};

// Obtener cotización individual y traer nombres legibles de papeles e insumos
const obtenerCotizacionPorId = async (id) => {
    const [cotRows] = await db.query(`
        SELECT c.*, cl.nombre AS nombre_cliente, cl.telefono AS telefono_cliente,
            cl.correo AS correo_cliente, cl.nit_dpi, cl.tipo_cliente, cl.descuento_porcentaje,
            u.nombre_completo AS nombre_usuario
        FROM cotizaciones c
        LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
        LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
        WHERE c.id_cotizacion = ?
    `, [id]);
    
    if (cotRows.length === 0) return null;

    await asegurarColumnasDetalle();

    const [detalleRows] = await db.query(`
        SELECT d.*,
            i_papel.nombre AS nombre_papel,
            i_acabado.nombre AS nombre_insumo, i_acabado.categoria AS categoria_insumo,
            m.nombre AS nombre_maquina,
            i_tinta.nombre AS nombre_tinta
        FROM detalle_cotizaciones d
        LEFT JOIN insumos i_papel ON d.id_papel = i_papel.id_insumo
        LEFT JOIN insumos i_acabado ON d.id_acabado = i_acabado.id_insumo
        LEFT JOIN maquinas m ON d.id_maquina = m.id_maquina
        LEFT JOIN insumos i_tinta ON d.id_tinta = i_tinta.id_insumo
        WHERE d.id_cotizacion = ?
    `, [id]);

    return { ...cotRows[0], detalle: detalleRows };
};

const asegurarColumnasDetalle = async () => {
    const [maquinaCol] = await db.query(`SHOW COLUMNS FROM detalle_cotizaciones LIKE 'id_maquina'`);
    if (maquinaCol.length === 0) {
        await db.query(`ALTER TABLE detalle_cotizaciones ADD COLUMN id_maquina INT NULL`);
    }
    const [tintaCol] = await db.query(`SHOW COLUMNS FROM detalle_cotizaciones LIKE 'id_tinta'`);
    if (tintaCol.length === 0) {
        await db.query(`ALTER TABLE detalle_cotizaciones ADD COLUMN id_tinta INT NULL`);
    }
};

const obtenerDetalleCotizacion = async (id) => {
    await asegurarColumnasDetalle();
    const [rows] = await db.query(`
        SELECT d.*, m.nombre AS nombre_maquina, i_tinta.nombre AS nombre_tinta
        FROM detalle_cotizaciones d
        LEFT JOIN maquinas m ON d.id_maquina = m.id_maquina
        LEFT JOIN insumos i_tinta ON d.id_tinta = i_tinta.id_insumo
        WHERE d.id_cotizacion = ?
    `, [id]);
    return rows;
};

const validarAceptacion = async (id) => {
    const detalles = await obtenerDetalleCotizacion(id);
    if (!detalles || detalles.length === 0) {
        return { ok: false, mensaje: 'La cotización no tiene líneas de detalle.' };
    }
    for (const item of detalles) {
    }
    return { ok: true };
};

// Obtar el historial de cotizaciones de un cliente específico
const obtenerCotizacionesPorCliente = async (id_cliente) => {
    const [rows] = await db.query(`
        SELECT c.*, u.nombre_completo AS nombre_usuario
        FROM cotizaciones c
        LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
        WHERE c.id_cliente = ?
        ORDER BY c.fecha_emision DESC
    `, [id_cliente]);
    return rows;
};

// Transacción segura para crear cotización y registrar dinámicamente sus ítems
const crearCotizacion = async (cotizacion, detalle) => {
    await asegurarColumnasDetalle();
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [cotResult] = await connection.query(`
            INSERT INTO cotizaciones (id_cliente, id_usuario, estado, total)
            VALUES (?, ?, 'Pendiente', 0)
        `, [cotizacion.id_cliente, cotizacion.id_usuario]);
        
        const id_cotizacion = cotResult.insertId;

        if (detalle && detalle.length > 0) {
            for (const item of detalle) {
                await connection.query(`
                    INSERT INTO detalle_cotizaciones
                        (id_cotizacion, tipo_trabajo, cantidad, tamano, id_papel, id_acabado,
                         consumo_estimado_tinta, tiempo_estimado_maquina, id_maquina, id_tinta, subtotal)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    id_cotizacion, item.tipo_trabajo, item.cantidad,
                    item.tamano || null, item.id_papel || null, item.id_acabado || null,
                    item.consumo_estimado_tinta || null, item.tiempo_estimado_maquina || null,
                    item.id_maquina || null, item.id_tinta || null,
                    item.subtotal
                ]);
            }
            
            // Auto-calcular y actualizar la sumatoria total en la cotización padre
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

// Cambiar estado (Pendiente, Aceptada, Rechazada)
const actualizarEstado = async (id, estado) => {
    const [result] = await db.query(
        'UPDATE cotizaciones SET estado = ? WHERE id_cotizacion = ?',
        [estado, id]
    );
    return result.affectedRows > 0;
};

// Lógica de gamificación/fidelidad: recalcular nivel de cliente en base a umbrales configurados
const actualizarNivelCliente = async (id_cliente) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Obtener sumatorias acumuladas de cotizaciones que ya fueron aceptadas
        const [totales] = await connection.query(`
            SELECT COUNT(*) AS total_cotizaciones, COALESCE(SUM(total), 0) AS monto_total
            FROM cotizaciones
            WHERE id_cliente = ? AND estado = 'Aceptada'
        `, [id_cliente]);
        
        const { total_cotizaciones, monto_total } = totales[0];

        // 2. Encontrar cuál es el nivel máximo alcanzado según las políticas de tu tabla niveles_cliente
        const [niveles] = await connection.query(`
            SELECT nombre, descuento_porcentaje
            FROM niveles_cliente
            WHERE umbral_total <= ? AND umbral_cotizaciones <= ?
            ORDER BY umbral_total DESC, umbral_cotizaciones DESC
            LIMIT 1
        `, [monto_total, total_cotizaciones]);

        // 3. Aplicar el ascenso automático al cliente
        if (niveles.length > 0) {
            const { nombre, descuento_porcentaje } = niveles[0];
            await connection.query(`
                UPDATE clientes
                SET tipo_cliente = ?, descuento_porcentaje = ?
                WHERE id_cliente = ?
            `, [nombre, descuento_porcentaje, id_cliente]);
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const guardarRutaPdf = async (id, ruta_pdf) => {
    const [result] = await db.query(
        'UPDATE cotizaciones SET ruta_pdf = ? WHERE id_cotizacion = ?',
        [ruta_pdf, id]
    );
    return result.affectedRows > 0;
};

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

// Consultas nativas para alimentar el frontend de manera dinámica
const obtenerPreciosBase = async () => {
    const [rows] = await db.query(`
        SELECT pb.*, i.nombre AS nombre_papel
        FROM precios_base pb
        LEFT JOIN insumos i ON pb.id_papel = i.id_insumo
        WHERE pb.activo = 1
        ORDER BY pb.tipo_trabajo, pb.tamano
    `);
    return rows;
};

const obtenerInsumos = async () => {
    const [rows] = await db.query(`
        SELECT * FROM insumos ORDER BY categoria, nombre
    `);
    return rows;
};

// Obtener máquinas disponibles
const obtenerMaquinas = async () => {
    // Corregido: Ahora busca en la tabla "maquinas" en lugar de "estado_maquina"
    const [rows] = await db.query(`
        SELECT * FROM maquinas WHERE estado = 'Disponible' ORDER BY nombre
    `);
    return rows;
};

module.exports = {
    obtenerCotizaciones, obtenerCotizacionPorId, obtenerCotizacionesPorCliente,
    crearCotizacion, actualizarEstado, actualizarNivelCliente,
    guardarRutaPdf, eliminarCotizacion,
    obtenerPreciosBase, obtenerInsumos, obtenerMaquinas,
    validarAceptacion
};