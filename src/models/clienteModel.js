const db = require('../config/db');

// Obtener todos los clientes
const obtenerClientes = async () => {
    const [rows] = await db.query('SELECT * FROM clientes ORDER BY fecha_registro DESC');
    return rows;
};

// Crear un nuevo cliente
const crearCliente = async (nombre, telefono, correo, nit_dpi, tipo_papel_preferido, diseno_frecuente) => {
    const query = `
        INSERT INTO clientes (nombre, telefono, correo, nit_dpi, tipo_papel_preferido, diseno_frecuente) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [nombre, telefono, correo, nit_dpi, tipo_papel_preferido, diseno_frecuente]);
    return result.insertId;
};

// Actualizar un cliente
const actualizarCliente = async (id, nombre, telefono, correo, nit_dpi, tipo_papel_preferido, diseno_frecuente) => {
    const query = `
        UPDATE clientes 
        SET nombre = ?, telefono = ?, correo = ?, nit_dpi = ?, tipo_papel_preferido = ?, diseno_frecuente = ? 
        WHERE id_cliente = ?
    `;
    const [result] = await db.query(query, [nombre, telefono, correo, nit_dpi, tipo_papel_preferido, diseno_frecuente, id]);
    return result.affectedRows > 0;
};

module.exports = {
    obtenerClientes,
    crearCliente,
    actualizarCliente
};