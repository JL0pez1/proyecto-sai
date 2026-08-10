const db = require('../config/db');

const inicializarTablas = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS produccion (
            id_orden INT AUTO_INCREMENT PRIMARY KEY,
            id_cotizacion INT NOT NULL,
            id_cliente INT NULL,
            id_usuario INT NULL,
            id_maquina INT NULL,
            estado VARCHAR(30) NOT NULL DEFAULT 'Pendiente',
            cliente_nombre VARCHAR(255) NULL,
            trabajo_base VARCHAR(255) NULL,
            detalle TEXT NULL,
            maquina VARCHAR(255) NULL,
            tiempo_estimado_horas DECIMAL(10,2) NOT NULL DEFAULT 0,
            tinta VARCHAR(255) NULL,
            cantidad_tinta DECIMAL(10,2) NOT NULL DEFAULT 0,
            fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            fecha_inicio DATETIME NULL,
            fecha_limite DATETIME NULL,
            fecha_fin DATETIME NULL,
            duracion_horas DECIMAL(10,2) NULL,
            motivo_detencion TEXT NULL,
            comentario_estado TEXT NULL,
            ultimo_avance TEXT NULL
        )
    `);

    const [idMaquinaCol] = await db.query(`SHOW COLUMNS FROM produccion LIKE 'id_maquina'`);
    if (idMaquinaCol.length === 0) {
        await db.query(`ALTER TABLE produccion ADD COLUMN id_maquina INT NULL`);
    }

    const [fechaFinCol] = await db.query(`SHOW COLUMNS FROM produccion LIKE 'fecha_fin'`);
    if (fechaFinCol.length === 0) {
        await db.query(`ALTER TABLE produccion ADD COLUMN fecha_fin DATETIME NULL`);
    }
    const [duracionCol] = await db.query(`SHOW COLUMNS FROM produccion LIKE 'duracion_horas'`);
    if (duracionCol.length === 0) {
        await db.query(`ALTER TABLE produccion ADD COLUMN duracion_horas DECIMAL(10,2) NULL`);
    }

    await db.query(`
        CREATE TABLE IF NOT EXISTS comentarios_produccion (
            id_comentario INT AUTO_INCREMENT PRIMARY KEY,
            id_orden INT NOT NULL,
            id_usuario INT NULL,
            mensaje TEXT NOT NULL,
            fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
};

const marcarMaquinaOcupada = async (connection, id_maquina) => {
    if (!id_maquina) return;
    if (connection) {
        await connection.query('UPDATE maquinas SET estado = ? WHERE id_maquina = ?', ['Ocupada', id_maquina]);
    } else {
        await db.query('UPDATE maquinas SET estado = ? WHERE id_maquina = ?', ['Ocupada', id_maquina]);
    }
};

const marcarMaquinaDisponible = async (connection, id_maquina) => {
    if (!id_maquina) return;
    if (connection) {
        await connection.query('UPDATE maquinas SET estado = ? WHERE id_maquina = ?', ['Disponible', id_maquina]);
    } else {
        await db.query('UPDATE maquinas SET estado = ? WHERE id_maquina = ?', ['Disponible', id_maquina]);
    }
};

const crearDesdeCotizacion = async (id_cotizacion) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [existente] = await connection.query(
            'SELECT id_orden FROM produccion WHERE id_cotizacion = ?',
            [id_cotizacion]
        );
        if (existente.length > 0) {
            await connection.commit();
            return existente[0].id_orden;
        }

        const [cotRows] = await connection.query(`
            SELECT c.id_cotizacion, c.id_cliente, c.id_usuario, c.total,
                cl.nombre AS nombre_cliente
            FROM cotizaciones c
            LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
            WHERE c.id_cotizacion = ?
        `, [id_cotizacion]);

        if (cotRows.length === 0) {
            await connection.rollback();
            return null;
        }

        const cotizacion = cotRows[0];
        const [detalleRows] = await connection.query(`
            SELECT d.tipo_trabajo, d.cantidad, d.tamano, d.id_papel, d.id_acabado,
                   d.consumo_estimado_tinta, d.tiempo_estimado_maquina, d.id_maquina, d.id_tinta,
                   m.nombre AS nombre_maquina, i_tinta.nombre AS nombre_tinta
            FROM detalle_cotizaciones d
            LEFT JOIN maquinas m ON d.id_maquina = m.id_maquina
            LEFT JOIN insumos i_tinta ON d.id_tinta = i_tinta.id_insumo
            WHERE d.id_cotizacion = ?
        `, [id_cotizacion]);

        const trabajoBase = detalleRows[0]?.tipo_trabajo || 'Sin detalle';
        const idMaquina = detalleRows[0]?.id_maquina || null;
        const nombreMaquina = detalleRows[0]?.nombre_maquina || (idMaquina ? 'Máquina asignada' : 'Por asignar');
        const maquina = idMaquina ? nombreMaquina : (detalleRows[0]?.tipo_trabajo ? 'Por asignar' : 'Sin asignar');
        const tiempoEstimado = detalleRows.reduce((sum, item) => sum + parseFloat(item.tiempo_estimado_maquina || 0), 0);
        const tintaTotal = detalleRows.reduce((sum, item) => sum + parseFloat(item.consumo_estimado_tinta || 0), 0);
        const fechaLimite = new Date(Date.now() + tiempoEstimado * 3600000);

        const [result] = await connection.query(`
            INSERT INTO produccion (
                id_cotizacion, id_cliente, id_usuario, id_maquina, estado, cliente_nombre,
                trabajo_base, detalle, maquina, tiempo_estimado_horas,
                tinta, cantidad_tinta, fecha_creacion
            ) VALUES (?, ?, ?, ?, 'Pendiente', ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            id_cotizacion,
            cotizacion.id_cliente,
            cotizacion.id_usuario,
            idMaquina,
            cotizacion.nombre_cliente || 'Cliente',
            trabajoBase,
            JSON.stringify(detalleRows),
            maquina,
            tiempoEstimado,
            'Sin tinta',
            tintaTotal
        ]);

        await connection.commit();
        return result.insertId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const listarProduccion = async () => {
    const [rows] = await db.query(`
        SELECT p.*, u.nombre_completo AS nombre_usuario
        FROM produccion p
        LEFT JOIN usuarios u ON p.id_usuario = u.id_usuario
        ORDER BY p.fecha_creacion DESC
    `);
    return rows;
};

const obtenerProduccionPorId = async (id) => {
    const [rows] = await db.query(`
        SELECT p.*, u.nombre_completo AS nombre_usuario
        FROM produccion p
        LEFT JOIN usuarios u ON p.id_usuario = u.id_usuario
        WHERE p.id_orden = ?
    `, [id]);
    return rows[0] || null;
};

const actualizarEstadoProduccion = async (id, estado, datos = {}) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const orden = await obtenerProduccionPorId(id);
        if (!orden) {
            await connection.rollback();
            return false;
        }

        const updates = [];
        const values = [];

        if (estado === 'En Proceso') {
            updates.push('estado = ?'); values.push(estado);
            if (orden.estado === 'Pendiente') {
                updates.push('fecha_inicio = NOW()');
                updates.push('fecha_limite = DATE_ADD(NOW(), INTERVAL ? HOUR)');
                values.push(parseFloat(orden.tiempo_estimado_horas || 0));
                updates.push('comentario_estado = ?'); values.push(datos.comentario || 'Inicio de producción');
                if (orden.id_maquina) {
                    await marcarMaquinaOcupada(orden.id_maquina);
                }
            } else {
                updates.push('comentario_estado = ?'); values.push(datos.comentario || 'Reanudación de producción');
            }
            updates.push('motivo_detencion = NULL');
        } else if (estado === 'Detenido') {
            updates.push('estado = ?'); values.push(estado);
            updates.push('motivo_detencion = ?'); values.push(datos.motivo || 'Sin motivo especificado');
            updates.push('comentario_estado = ?'); values.push(datos.comentario || 'Producción detenida');
        } else if (estado === 'Completado') {
            updates.push('estado = ?'); values.push(estado);
            updates.push('comentario_estado = ?'); values.push(datos.comentario || 'Producción completada');
            updates.push('fecha_fin = NOW()');
            if (orden.fecha_inicio) {
                const inicio = new Date(orden.fecha_inicio).getTime();
                const duracion = ((Date.now() - inicio) / 3600000).toFixed(2);
                updates.push('duracion_horas = ?'); values.push(parseFloat(duracion));
            }
            if (orden.id_maquina) {
                await marcarMaquinaDisponible(orden.id_maquina);
            }
        } else {
            updates.push('estado = ?'); values.push(estado);
        }

        values.push(id);
        await connection.query(`UPDATE produccion SET ${updates.join(', ')} WHERE id_orden = ?`, values);
        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const agregarComentario = async (id_orden, id_usuario, mensaje) => {
    await db.query(
        'INSERT INTO comentarios_produccion (id_orden, id_usuario, mensaje) VALUES (?, ?, ?)',
        [id_orden, id_usuario, mensaje]
    );
    return true;
};

const listarComentarios = async (id_orden) => {
    const [rows] = await db.query(`
        SELECT cp.*, u.nombre_completo AS nombre_usuario
        FROM comentarios_produccion cp
        LEFT JOIN usuarios u ON cp.id_usuario = u.id_usuario
        WHERE cp.id_orden = ?
        ORDER BY cp.fecha_creacion ASC
    `, [id_orden]);
    return rows;
};

module.exports = {
    inicializarTablas,
    crearDesdeCotizacion,
    listarProduccion,
    obtenerProduccionPorId,
    actualizarEstadoProduccion,
    agregarComentario,
    listarComentarios
};
