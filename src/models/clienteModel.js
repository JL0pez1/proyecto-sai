const db = require('../config/db');

// Obtener todos los clientes con info del usuario asignado
const obtenerClientes = async () => {
    const [rows] = await db.query(`
        SELECT 
            c.*,
            u.nombre_completo AS nombre_usuario_asignado
        FROM clientes c
        LEFT JOIN usuarios u ON c.id_usuario_asignado = u.id_usuario
        ORDER BY c.fecha_registro DESC
    `);
    return rows;
};

// Obtener un cliente por ID
const obtenerClientePorId = async (id) => {
    const [rows] = await db.query(
        'SELECT * FROM clientes WHERE id_cliente = ?',
        [id]
    );
    return rows[0] || null;
};

// Crear un nuevo cliente (con todos los campos de la tabla)
const crearCliente = async (datos) => {
    const {
        nombre,
        telefono,
        correo,
        nit_dpi,
        tipo_papel_preferido,
        diseno_frecuente,
        tipo_cliente,
        descuento_porcentaje,
        id_usuario_asignado
    } = datos;

    const query = `
        INSERT INTO clientes 
            (nombre, telefono, correo, nit_dpi, tipo_papel_preferido, diseno_frecuente, 
             tipo_cliente, descuento_porcentaje, id_usuario_asignado) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [
        nombre,
        telefono || null,
        correo || null,
        nit_dpi || null,
        tipo_papel_preferido || null,
        diseno_frecuente || null,
        tipo_cliente || 'Regular',
        descuento_porcentaje || 0.00,
        id_usuario_asignado || null
    ]);
    return result.insertId;
};

// Actualizar cliente (todos los campos)
const actualizarCliente = async (id, datos) => {
    const {
        nombre,
        telefono,
        correo,
        nit_dpi,
        tipo_papel_preferido,
        diseno_frecuente,
        tipo_cliente,
        descuento_porcentaje,
        id_usuario_asignado
    } = datos;

    const query = `
        UPDATE clientes 
        SET nombre = ?, telefono = ?, correo = ?, nit_dpi = ?,
            tipo_papel_preferido = ?, diseno_frecuente = ?,
            tipo_cliente = ?, descuento_porcentaje = ?, id_usuario_asignado = ?
        WHERE id_cliente = ?
    `;
    const [result] = await db.query(query, [
        nombre,
        telefono || null,
        correo || null,
        nit_dpi || null,
        tipo_papel_preferido || null,
        diseno_frecuente || null,
        tipo_cliente || 'Regular',
        descuento_porcentaje || 0.00,
        id_usuario_asignado || null,
        id
    ]);
    return result.affectedRows > 0;
};

// Eliminar cliente
const eliminarCliente = async (id) => {
    const [result] = await db.query(
        'DELETE FROM clientes WHERE id_cliente = ?',
        [id]
    );
    return result.affectedRows > 0;
};

module.exports = {
    obtenerClientes,
    obtenerClientePorId,
    crearCliente,
    actualizarCliente,
    eliminarCliente
};