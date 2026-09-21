const db = require('../config/db');

const PERIODOS_VALIDOS = new Set(['dia', 'semana', 'mes', 'trimestre', 'anual']);

const obtenerRango = (inicio, fin) => {
    const inicioValido = /^\d{4}-\d{2}-\d{2}$/.test(inicio || '') ? inicio : null;
    const finValido = /^\d{4}-\d{2}-\d{2}$/.test(fin || '') ? fin : null;
    const hoy = new Date();
    const fechaFin = finValido || hoy.toISOString().slice(0, 10);
    const fechaInicio = inicioValido || `${hoy.getFullYear()}-01-01`;
    return {
        inicio: `${fechaInicio} 00:00:00`,
        fin: `${fechaFin} 23:59:59`,
        inicioTexto: fechaInicio,
        finTexto: fechaFin
    };
};

const expresionPeriodo = periodo => {
    switch (periodo) {
        case 'dia': return "DATE_FORMAT(c.fecha_emision, '%Y-%m-%d')";
        case 'semana': return "CONCAT(YEAR(c.fecha_emision), '-S', LPAD(WEEK(c.fecha_emision, 3), 2, '0'))";
        case 'mes': return "DATE_FORMAT(c.fecha_emision, '%Y-%m')";
        case 'trimestre': return "CONCAT(YEAR(c.fecha_emision), '-T', QUARTER(c.fecha_emision))";
        case 'anual': return "CAST(YEAR(c.fecha_emision) AS CHAR)";
        default: return "DATE_FORMAT(c.fecha_emision, '%Y-%m-%d')";
    }
};

const listarReporte = async ({ inicio, fin, periodo }) => {
    const rango = obtenerRango(inicio, fin);
    const granularidad = PERIODOS_VALIDOS.has(periodo) ? periodo : 'mes';
    const grupo = expresionPeriodo(granularidad);
    const parametros = [rango.inicio, rango.fin];

    const [resumen] = await db.query(`
        SELECT
            COUNT(*) AS cotizaciones,
            SUM(c.estado = 'Aceptada') AS ventas,
            COALESCE(SUM(CASE WHEN c.estado = 'Aceptada' THEN c.total ELSE 0 END), 0) AS ingresos,
            SUM(c.estado = 'Pendiente') AS pendientes,
            SUM(c.estado = 'Rechazada') AS rechazadas
        FROM cotizaciones c
        WHERE c.fecha_emision BETWEEN ? AND ?
    `, parametros);

    const [produccion] = await db.query(`
        SELECT
            COUNT(o.id_orden) AS ordenes,
            SUM(o.estado_actual IN ('Terminado', 'Entregado')) AS exitos,
            SUM(o.estado_actual = 'En producción') AS en_produccion,
            SUM(o.estado_actual = 'Cancelado') AS canceladas,
            SUM(o.alerta_retraso = 1 OR (o.fecha_entrega_estimada < NOW() AND o.estado_actual NOT IN ('Terminado', 'Entregado', 'Cancelado'))) AS atrasos
        FROM ordenes_produccion o
        INNER JOIN cotizaciones c ON c.id_cotizacion = o.id_cotizacion
        WHERE c.fecha_emision BETWEEN ? AND ?
    `, parametros);

    const [tendencia] = await db.query(`
        SELECT ${grupo} AS periodo,
            COUNT(*) AS cotizaciones,
            SUM(c.estado = 'Aceptada') AS ventas,
            COALESCE(SUM(CASE WHEN c.estado = 'Aceptada' THEN c.total ELSE 0 END), 0) AS ingresos
        FROM cotizaciones c
        WHERE c.fecha_emision BETWEEN ? AND ?
        GROUP BY ${grupo}
        ORDER BY MIN(c.fecha_emision)
    `, parametros);

    const [productos] = await db.query(`
        SELECT d.tipo_trabajo AS producto,
            SUM(d.cantidad) AS cantidad,
            COUNT(DISTINCT c.id_cotizacion) AS solicitudes,
            COALESCE(SUM(d.subtotal), 0) AS ingresos
        FROM detalle_cotizaciones d
        INNER JOIN cotizaciones c ON c.id_cotizacion = d.id_cotizacion AND c.estado = 'Aceptada'
        WHERE c.fecha_emision BETWEEN ? AND ?
        GROUP BY d.tipo_trabajo
        ORDER BY cantidad DESC, solicitudes DESC
        LIMIT 10
    `, parametros);

    const [clientes] = await db.query(`
        SELECT cl.nombre AS cliente,
            COUNT(c.id_cotizacion) AS compras,
            COALESCE(SUM(c.total), 0) AS ingresos
        FROM cotizaciones c
        INNER JOIN clientes cl ON cl.id_cliente = c.id_cliente
        WHERE c.estado = 'Aceptada' AND c.fecha_emision BETWEEN ? AND ?
        GROUP BY cl.id_cliente, cl.nombre
        ORDER BY compras DESC, ingresos DESC
        LIMIT 10
    `, parametros);

    const [nuevosClientes] = await db.query(`
        SELECT COUNT(*) AS total
        FROM clientes
        WHERE fecha_registro BETWEEN ? AND ?
    `, parametros);

    return {
        rango: { inicio: rango.inicioTexto, fin: rango.finTexto, periodo: granularidad },
        resumen: { ...resumen[0], ...produccion[0], clientes_nuevos: nuevosClientes[0].total },
        tendencia,
        productos,
        clientes
    };
};

module.exports = { listarReporte };
