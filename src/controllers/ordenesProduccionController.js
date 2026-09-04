const db = require('../config/db');

// =====================================================
// HELPERS INTERNOS
// =====================================================

// Registra un cambio de estado en el historial (REQ004-003)
const registrarHistorial = async (connection, id_orden, estado_anterior, estado_nuevo, id_usuario) => {
    await connection.query(
        `INSERT INTO historial_estados_orden (id_orden, estado_anterior, estado_nuevo, id_usuario)
         VALUES (?, ?, ?, ?)`,
        [id_orden, estado_anterior, estado_nuevo, id_usuario || null]
    );
};

// Crea una notificación interna para uno o varios usuarios (REQ004-004 y 007)
const crearNotificacion = async (connection, id_usuarios_destino, id_orden, mensaje) => {
    const destinos = Array.isArray(id_usuarios_destino) ? id_usuarios_destino : [id_usuarios_destino];
    for (const id_usuario_destino of destinos) {
        await connection.query(
            `INSERT INTO notificaciones (id_usuario_destino, id_orden, mensaje) VALUES (?, ?, ?)`,
            [id_usuario_destino, id_orden, mensaje]
        );
    }
};

// Suma en horas el tiempo real invertido a partir de los segmentos en tiempos_produccion
const calcularTiempoRealHoras = (segmentos) => {
    let totalMs = 0;
    const ahora = Date.now();
    segmentos.forEach(s => {
        const inicio = new Date(s.inicio).getTime();
        const fin = s.fin ? new Date(s.fin).getTime() : ahora; // si sigue activo, cuenta hasta ahora
        if (!Number.isNaN(inicio)) totalMs += Math.max(0, fin - inicio);
    });
    return totalMs / 3600000;
};

const asegurarColumnasOrden = async () => {
    const columnas = [
        ['tiempo_estimado_horas', 'DECIMAL(10,2) NULL'],
        ['fecha_inicio_real', 'DATETIME NULL'],
        ['fecha_fin_real', 'DATETIME NULL']
    ];
    for (const [nombre, tipo] of columnas) {
        const [existente] = await db.query(`SHOW COLUMNS FROM ordenes_produccion LIKE ?`, [nombre]);
        if (existente.length === 0) {
            await db.query(`ALTER TABLE ordenes_produccion ADD COLUMN ${nombre} ${tipo}`);
        }
    }
    const [estado] = await db.query(`SHOW COLUMNS FROM ordenes_produccion LIKE 'estado_actual'`);
    if (estado[0] && !String(estado[0].Type).includes("'Cancelado'")) {
        await db.query(`ALTER TABLE ordenes_produccion MODIFY estado_actual ENUM('Confirmado','En producción','Terminado','Entregado','Cancelado') DEFAULT 'Confirmado'`);
    }
};

const notificarVentas = async (connection, id_orden, mensaje) => {
    const [destinatarios] = await connection.query(
        `SELECT id_usuario FROM usuarios WHERE id_rol = 2 AND estado = 'Activo'`
    );
    await crearNotificacion(connection, destinatarios.map(u => u.id_usuario), id_orden, mensaje);
};

// =====================================================
// CREACIÓN DE ORDEN (REQ005-001) — se llama al aceptar una cotización
// =====================================================
const crearDesdeCotizacion = async (id_cotizacion) => {
    await asegurarColumnasOrden();
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [existente] = await connection.query(
            'SELECT id_orden FROM ordenes_produccion WHERE id_cotizacion = ?',
            [id_cotizacion]
        );
        if (existente.length > 0) {
            await connection.commit();
            return existente[0].id_orden;
        }

        const [result] = await connection.query(
            `INSERT INTO ordenes_produccion (id_cotizacion, fecha_entrega_estimada, estado_actual, prioridad, tiempo_estimado_horas)
             VALUES (?, NULL, 'Confirmado', 'Normal', NULL)`,
            [id_cotizacion]
        );
        const id_orden = result.insertId;

        await registrarHistorial(connection, id_orden, null, 'Confirmado', null);

        await connection.commit();
        return id_orden;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// =====================================================
// LISTADO (REQ004-001)
// =====================================================
const listarOrdenes = async () => {
    await asegurarColumnasOrden();
    const [rows] = await db.query(`
        SELECT
            o.id_orden, o.id_cotizacion, o.fecha_creacion, o.fecha_entrega_estimada,
            o.estado_actual, o.prioridad, o.tiempo_real_invertido, o.alerta_retraso,
            o.tiempo_estimado_horas, o.fecha_inicio_real, o.fecha_fin_real,
            cl.nombre AS cliente_nombre,
            m.nombre AS maquina_nombre, u.nombre_completo AS operador_nombre
        FROM ordenes_produccion o
        LEFT JOIN cotizaciones c ON c.id_cotizacion = o.id_cotizacion
        LEFT JOIN clientes cl ON cl.id_cliente = c.id_cliente
        LEFT JOIN (
            SELECT om1.* FROM orden_maquina om1
            INNER JOIN (
                SELECT id_orden, MAX(id_asignacion) AS max_id FROM orden_maquina GROUP BY id_orden
            ) om2 ON om1.id_asignacion = om2.max_id
        ) om ON om.id_orden = o.id_orden
        LEFT JOIN maquinas m ON m.id_maquina = om.id_maquina
        LEFT JOIN usuarios u ON u.id_usuario = om.id_usuario
        ORDER BY
            FIELD(o.prioridad, 'Urgente', 'Normal'),
            o.fecha_entrega_estimada ASC
    `);
    return rows;
};

// =====================================================
// DETALLE COMPLETO DE UNA ORDEN
// =====================================================
const obtenerOrden = async (id_orden) => {
    await asegurarColumnasOrden();
    await db.query(`
        CREATE TABLE IF NOT EXISTS comentarios_produccion (
            id_comentario INT AUTO_INCREMENT PRIMARY KEY,
            id_orden INT NOT NULL,
            id_usuario INT NULL,
            mensaje TEXT NOT NULL,
            fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const [ordenRows] = await db.query(`
        SELECT o.*, cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono
        FROM ordenes_produccion o
        LEFT JOIN cotizaciones c ON c.id_cotizacion = o.id_cotizacion
        LEFT JOIN clientes cl ON cl.id_cliente = c.id_cliente
        WHERE o.id_orden = ?
    `, [id_orden]);
    if (ordenRows.length === 0) return null;
    const orden = ordenRows[0];

    const [detalle] = await db.query(
        `SELECT * FROM detalle_cotizaciones WHERE id_cotizacion = ?`, [orden.id_cotizacion]
    );

    const [tiempos] = await db.query(
        `SELECT tp.*, u.nombre_completo AS usuario_nombre
         FROM tiempos_produccion tp LEFT JOIN usuarios u ON u.id_usuario = tp.id_usuario
         WHERE tp.id_orden = ? ORDER BY tp.inicio ASC`, [id_orden]
    );

    const [historial] = await db.query(
        `SELECT h.*, u.nombre_completo AS usuario_nombre
         FROM historial_estados_orden h LEFT JOIN usuarios u ON u.id_usuario = h.id_usuario
         WHERE h.id_orden = ? ORDER BY h.fecha_cambio ASC`, [id_orden]
    );

    const [asignaciones] = await db.query(
        `SELECT oa.*, m.nombre AS maquina_nombre, u.nombre_completo AS operador_nombre
         FROM orden_maquina oa
         LEFT JOIN maquinas m ON m.id_maquina = oa.id_maquina
         LEFT JOIN usuarios u ON u.id_usuario = oa.id_usuario
         WHERE oa.id_orden = ? ORDER BY oa.fecha_asignacion DESC`, [id_orden]
    );

    const [consumos] = await db.query(
        `SELECT c.*, i.nombre AS insumo_nombre
         FROM consumo_insumos_orden c LEFT JOIN insumos i ON i.id_insumo = c.id_insumo
         WHERE c.id_orden = ?`, [id_orden]
    );

    const [comentarios] = await db.query(
        `SELECT cp.*, u.nombre_completo AS nombre_usuario
         FROM comentarios_produccion cp
         LEFT JOIN usuarios u ON u.id_usuario = cp.id_usuario
         WHERE cp.id_orden = ? ORDER BY cp.fecha_creacion ASC`, [id_orden]
    );

    const inicioReal = orden.fecha_inicio_real || tiempos[0]?.inicio;
    const finReal = orden.fecha_fin_real || (inicioReal ? new Date() : null);
    const tiempoRealHoras = inicioReal && finReal
        ? Math.max(0, (new Date(finReal).getTime() - new Date(inicioReal).getTime()) / 3600000)
        : 0;
    const tiempoEstimadoHoras = parseFloat(orden.tiempo_estimado_horas || 0);

    return {
        ...orden,
        detalle,
        tiempos,
        historial,
        asignaciones,
        consumos,
        comentarios,
        comparativo: {
            tiempo_estimado_horas: tiempoEstimadoHoras,
            tiempo_real_horas: parseFloat(tiempoRealHoras.toFixed(2)),
            diferencia_horas: parseFloat((tiempoRealHoras - tiempoEstimadoHoras).toFixed(2))
        }
    };
};

// =====================================================
// ASIGNAR MÁQUINA / OPERADOR (REQ004-005)
// =====================================================
const asignarMaquinaOperador = async (id_orden, id_maquina, id_usuario_operador) => {
    if (!id_maquina) return { exito: false, mensaje: 'Debes seleccionar una máquina' };

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [ordenes] = await connection.query(
            `SELECT estado_actual FROM ordenes_produccion WHERE id_orden = ? FOR UPDATE`, [id_orden]
        );
        if (!ordenes.length) {
            await connection.rollback();
            return { exito: false, mensaje: 'Orden no encontrada' };
        }
        if (['Terminado', 'Entregado', 'Cancelado'].includes(ordenes[0].estado_actual)) {
            await connection.rollback();
            return { exito: false, mensaje: 'La orden ya no permite cambiar de máquina' };
        }

        const [maquinas] = await connection.query(
            `SELECT id_maquina, nombre, estado FROM maquinas WHERE id_maquina = ?`,
            [id_maquina]
        );
        if (!maquinas.length) {
            await connection.rollback();
            return { exito: false, mensaje: 'La máquina no existe' };
        }
        if (maquinas[0].estado !== 'Disponible') {
            await connection.rollback();
            return { exito: false, mensaje: 'Solo puedes seleccionar una máquina disponible' };
        }

        const [actual] = await connection.query(
            `SELECT id_asignacion, id_maquina FROM orden_maquina WHERE id_orden = ? ORDER BY id_asignacion DESC LIMIT 1 FOR UPDATE`,
            [id_orden]
        );
        if (actual[0]?.id_maquina === Number(id_maquina)) {
            await connection.commit();
            return { exito: true, mensaje: 'La máquina ya estaba asignada' };
        }
        if (actual[0]?.id_maquina) {
            await connection.query(`UPDATE maquinas SET estado = 'Disponible' WHERE id_maquina = ?`, [actual[0].id_maquina]);
        }

        await connection.query(
            `INSERT INTO orden_maquina (id_orden, id_maquina, id_usuario) VALUES (?, ?, ?)`,
            [id_orden, id_maquina, id_usuario_operador || null]
        );
        await connection.commit();
        return { exito: true, mensaje: `Máquina ${maquinas[0].nombre} seleccionada; quedará bloqueada al iniciar` };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const listarMaquinasDisponibles = async () => {
    const [rows] = await db.query(`SELECT id_maquina, nombre, precio_por_hora FROM maquinas WHERE estado = 'Disponible' ORDER BY nombre`);
    return rows;
};

const actualizarTiempoEstimado = async (id_orden, horas) => {
    const tiempo = Number(horas);
    if (!Number.isFinite(tiempo) || tiempo <= 0) {
        return { exito: false, mensaje: 'El tiempo estimado debe ser mayor que cero' };
    }
    await asegurarColumnasOrden();
    const [result] = await db.query(
        `UPDATE ordenes_produccion
         SET tiempo_estimado_horas = ?, fecha_entrega_estimada = DATE_ADD(CURDATE(), INTERVAL ? HOUR)
         WHERE id_orden = ? AND estado_actual IN ('Confirmado', 'En producción')`,
        [tiempo, tiempo, id_orden]
    );
    if (!result.affectedRows) return { exito: false, mensaje: 'La orden no permite actualizar el tiempo' };
    return { exito: true, mensaje: 'Tiempo estimado actualizado' };
};

const cambiarPrioridad = async (id_orden, prioridad) => {
    await db.query(`UPDATE ordenes_produccion SET prioridad = ? WHERE id_orden = ?`, [prioridad, id_orden]);
    return true;
};

// =====================================================
// CRONÓMETRO (REQ005-002): iniciar / pausar / reanudar / finalizar
// =====================================================
const iniciarCronometro = async (id_orden, id_usuario, observaciones, id_maquina, horas) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [ordenRows] = await connection.query(
            `SELECT estado_actual FROM ordenes_produccion WHERE id_orden = ? FOR UPDATE`, [id_orden]
        );
        if (ordenRows.length === 0) { await connection.rollback(); return { exito: false, mensaje: 'Orden no encontrada' }; }
        const estadoAnterior = ordenRows[0].estado_actual;

        if (estadoAnterior !== 'Confirmado') {
            await connection.rollback();
            return { exito: false, mensaje: 'La orden ya fue iniciada o cerrada' };
        }
        const tiempoIngresado = Number(horas);
        if (!Number.isFinite(tiempoIngresado) || tiempoIngresado <= 0 || !id_maquina) {
            await connection.rollback();
            return { exito: false, mensaje: 'Selecciona una impresora e indica el tiempo antes de iniciar' };
        }

        const [maquinas] = await connection.query(
            `SELECT id_maquina, nombre FROM maquinas WHERE id_maquina = ? AND estado = 'Disponible' FOR UPDATE`,
            [id_maquina]
        );
        if (!maquinas.length) {
            await connection.rollback();
            return { exito: false, mensaje: 'La máquina seleccionada ya está ocupada; elige otra' };
        }

        await connection.query(
            `UPDATE maquinas SET estado = 'En uso' WHERE id_maquina = ?`,
            [id_maquina]
        );
        await connection.query(
            `INSERT INTO orden_maquina (id_orden, id_maquina, id_usuario) VALUES (?, ?, ?)`,
            [id_orden, id_maquina, id_usuario]
        );
        await connection.query(
            `UPDATE ordenes_produccion SET tiempo_estimado_horas = ?, fecha_entrega_estimada = DATE_ADD(CURDATE(), INTERVAL ? HOUR) WHERE id_orden = ?`,
            [tiempoIngresado, tiempoIngresado, id_orden]
        );

        await connection.query(
            `INSERT INTO tiempos_produccion (id_orden, id_usuario, inicio, estado, observaciones)
             VALUES (?, ?, NOW(), 'Activo', ?)`,
            [id_orden, id_usuario, observaciones || null]
        );

        if (estadoAnterior !== 'En producción') {
            await connection.query(
                `UPDATE ordenes_produccion SET estado_actual = 'En producción', fecha_inicio_real = COALESCE(fecha_inicio_real, NOW()) WHERE id_orden = ?`,
                [id_orden]
            );
            await registrarHistorial(connection, id_orden, estadoAnterior, 'En producción', id_usuario);
        } else {
            await connection.query(
                `UPDATE ordenes_produccion SET fecha_inicio_real = COALESCE(fecha_inicio_real, NOW()) WHERE id_orden = ?`,
                [id_orden]
            );
        }

        await notificarVentas(connection, id_orden, `La orden #${id_orden} fue iniciada por Producción.`);

        await connection.commit();
        return { exito: true };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const pausarCronometro = async (id_orden, id_usuario, motivo) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [activos] = await connection.query(
            `SELECT id_tiempo FROM tiempos_produccion WHERE id_orden = ? AND estado = 'Activo'
             ORDER BY inicio DESC LIMIT 1 FOR UPDATE`, [id_orden]
        );
        if (activos.length === 0) { await connection.rollback(); return { exito: false, mensaje: 'No hay un segmento activo para pausar' }; }

        await connection.query(
            `UPDATE tiempos_produccion SET fin = NOW(), estado = 'Pausado', observaciones = CONCAT(COALESCE(observaciones,''), ?) WHERE id_tiempo = ?`,
            [motivo ? `\n[Pausa] ${motivo}` : '', activos[0].id_tiempo]
        );

        await notificarVentas(connection, id_orden, `La orden #${id_orden} fue pausada por Producción${motivo ? `: ${motivo}` : '.'}`);

        await connection.commit();
        return { exito: true };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const reanudarCronometro = async (id_orden, id_usuario) => {
    await asegurarColumnasOrden();
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query(
            `INSERT INTO tiempos_produccion (id_orden, id_usuario, inicio, estado) VALUES (?, ?, NOW(), 'Activo')`,
            [id_orden, id_usuario]
        );
        await connection.query(
            `UPDATE ordenes_produccion SET estado_actual = 'En producción', fecha_inicio_real = COALESCE(fecha_inicio_real, NOW()) WHERE id_orden = ?`,
            [id_orden]
        );
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
    return { exito: true };
};

const finalizarCronometro = async (id_orden, id_usuario) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Cierra cualquier segmento activo
        await connection.query(
            `UPDATE tiempos_produccion SET fin = NOW(), estado = 'Finalizado'
             WHERE id_orden = ? AND estado = 'Activo'`,
            [id_orden]
        );

        const [ordenRows] = await connection.query(
            `SELECT estado_actual, fecha_inicio_real FROM ordenes_produccion WHERE id_orden = ?`, [id_orden]
        );
        const estadoAnterior = ordenRows[0]?.estado_actual;
        const inicioReal = ordenRows[0]?.fecha_inicio_real;
        const tiempoRealHoras = inicioReal
            ? Math.max(0, (Date.now() - new Date(inicioReal).getTime()) / 3600000)
            : 0;

        await connection.query(
            `UPDATE ordenes_produccion SET estado_actual = 'Terminado', tiempo_real_invertido = ?, fecha_fin_real = NOW() WHERE id_orden = ?`,
            [Math.round(tiempoRealHoras * 60), id_orden]
        );

        await registrarHistorial(connection, id_orden, estadoAnterior, 'Terminado', id_usuario);

        const [asignaciones] = await connection.query(
            `SELECT id_maquina FROM orden_maquina WHERE id_orden = ? ORDER BY id_asignacion DESC LIMIT 1`, [id_orden]
        );
        if (asignaciones[0]?.id_maquina) {
            await connection.query(`UPDATE maquinas SET estado = 'Disponible' WHERE id_maquina = ?`, [asignaciones[0].id_maquina]);
        }

        // REQ004-007: notificación interna a Ventas/Recepción (rol 2) y Admin (rol 1) para proceder con la entrega
        const [destinatarios] = await connection.query(
            `SELECT id_usuario FROM usuarios WHERE id_rol IN (1,2) AND estado = 'Activo'`
        );
        await crearNotificacion(
            connection,
            destinatarios.map(u => u.id_usuario),
            id_orden,
            `La orden #${id_orden} fue marcada como Terminada. Puede proceder con la entrega al cliente.`
        );

        await connection.commit();
        return { exito: true };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const cancelarOrden = async (id_orden, id_usuario) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [ordenes] = await connection.query(
            `SELECT estado_actual FROM ordenes_produccion WHERE id_orden = ? FOR UPDATE`, [id_orden]
        );
        if (!ordenes.length) {
            await connection.rollback();
            return { exito: false, mensaje: 'Orden no encontrada' };
        }
        if (ordenes[0].estado_actual === 'Entregado') {
            await connection.rollback();
            return { exito: false, mensaje: 'Una orden entregada no se puede cancelar' };
        }
        await connection.query(`UPDATE tiempos_produccion SET fin = NOW(), estado = 'Finalizado' WHERE id_orden = ? AND estado = 'Activo'`, [id_orden]);
        const [asignaciones] = await connection.query(
            `SELECT id_maquina FROM orden_maquina WHERE id_orden = ? ORDER BY id_asignacion DESC LIMIT 1`, [id_orden]
        );
        if (asignaciones[0]?.id_maquina) {
            await connection.query(`UPDATE maquinas SET estado = 'Disponible' WHERE id_maquina = ?`, [asignaciones[0].id_maquina]);
        }
        await connection.query(`UPDATE ordenes_produccion SET estado_actual = 'Cancelado' WHERE id_orden = ?`, [id_orden]);
        await registrarHistorial(connection, id_orden, ordenes[0].estado_actual, 'Cancelado', id_usuario);
        await notificarVentas(connection, id_orden, `La orden #${id_orden} fue cancelada por Producción.`);
        await connection.commit();
        return { exito: true, mensaje: 'Orden cancelada y máquina liberada' };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const marcarEntregado = async (id_orden, id_usuario) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [ordenRows] = await connection.query(
            `SELECT estado_actual FROM ordenes_produccion WHERE id_orden = ?`, [id_orden]
        );
        if (ordenRows.length === 0) { await connection.rollback(); return { exito: false, mensaje: 'Orden no encontrada' }; }
        const estadoAnterior = ordenRows[0].estado_actual;

        await connection.query(
            `UPDATE ordenes_produccion SET estado_actual = 'Entregado' WHERE id_orden = ?`, [id_orden]
        );
        await registrarHistorial(connection, id_orden, estadoAnterior, 'Entregado', id_usuario);

        await connection.commit();
        return { exito: true };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// =====================================================
// CONSUMO REAL DE INSUMOS (REQ005-005)
// =====================================================
const registrarConsumoInsumo = async (id_orden, id_insumo, cantidad_real, cantidad_estimada) => {
    await db.query(
        `INSERT INTO consumo_insumos_orden (id_orden, id_insumo, cantidad_estimada, cantidad_real)
         VALUES (?, ?, ?, ?)`,
        [id_orden, id_insumo, cantidad_estimada || null, cantidad_real]
    );
    return { exito: true };
};

// =====================================================
// NOTIFICACIONES INTERNAS (REQ004-004, 007)
// =====================================================
const listarNotificaciones = async (id_usuario) => {
    const [rows] = await db.query(
        `SELECT * FROM notificaciones WHERE id_usuario_destino = ? ORDER BY fecha_creacion DESC LIMIT 50`,
        [id_usuario]
    );
    return rows;
};

const marcarNotificacionLeida = async (id_notificacion, id_usuario) => {
    await db.query(
        `UPDATE notificaciones SET leida = 1 WHERE id_notificacion = ? AND id_usuario_destino = ?`,
        [id_notificacion, id_usuario]
    );
    return { exito: true };
};

const limpiarNotificacionesLeidas = async (id_usuario) => {
    const [result] = await db.query(
        `DELETE FROM notificaciones WHERE id_usuario_destino = ? AND leida = 1`, [id_usuario]
    );
    return { exito: true, eliminadas: result.affectedRows };
};

// =====================================================
// REVISIÓN AUTOMÁTICA DE RETRASOS (REQ004-004) — la llama un cron/interval
// =====================================================
const revisarRetrasos = async () => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

                await asegurarColumnasOrden();
                const [atrasadas] = await connection.query(`
                        SELECT o.id_orden, o.tiempo_estimado_horas, MIN(t.inicio) AS inicio_real
                        FROM ordenes_produccion o
                        INNER JOIN tiempos_produccion t ON t.id_orden = o.id_orden
                        WHERE o.estado_actual = 'En producción'
                            AND o.alerta_retraso = 0
                            AND o.tiempo_estimado_horas > 0
                        GROUP BY o.id_orden, o.tiempo_estimado_horas
                        HAVING MIN(t.inicio) <= DATE_SUB(NOW(), INTERVAL o.tiempo_estimado_horas HOUR)
                `);

        if (atrasadas.length > 0) {
            const [destinatarios] = await connection.query(
                `SELECT id_usuario FROM usuarios WHERE id_rol IN (1,3) AND estado = 'Activo'`
            );
            for (const { id_orden } of atrasadas) {
                await connection.query(
                    `UPDATE ordenes_produccion SET alerta_retraso = 1 WHERE id_orden = ?`, [id_orden]
                );
                await crearNotificacion(
                    connection,
                    destinatarios.map(u => u.id_usuario),
                    id_orden,
                    `⚠️ La orden #${id_orden} superó su fecha de entrega estimada y sigue en producción.`
                );
            }
        }

        await connection.commit();
        return atrasadas.length;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    prepararEsquemaOrdenes: asegurarColumnasOrden,
    crearDesdeCotizacion,
    listarOrdenes,
    obtenerOrden,
    asignarMaquinaOperador,
    listarMaquinasDisponibles,
    actualizarTiempoEstimado,
    cambiarPrioridad,
    iniciarCronometro,
    pausarCronometro,
    reanudarCronometro,
    finalizarCronometro,
    cancelarOrden,
    marcarEntregado,
    registrarConsumoInsumo,
    listarNotificaciones,
    marcarNotificacionLeida,
    limpiarNotificacionesLeidas,
    revisarRetrasos
};