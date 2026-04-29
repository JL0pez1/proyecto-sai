const db = require('../config/db');

// Obtener todos los insumos
const obtenerInsumos = async () => {
    const [rows] = await db.query('SELECT * FROM insumos');
    return rows;
};

// Obtener un insumo por su ID
const obtenerInsumoPorId = async (id) => {
    const [rows] = await db.query('SELECT * FROM insumos WHERE id_insumo = ?', [id]);
    return rows[0];
};

// Crear un nuevo insumo
const crearInsumo = async (nombre, categoria, costo_unitario, precio_venta) => {
    const query = 'INSERT INTO insumos (nombre, categoria, costo_unitario, precio_venta) VALUES (?, ?, ?, ?)';
    const [result] = await db.query(query, [nombre, categoria, costo_unitario, precio_venta]);
    return result.insertId;
};

// Actualizar un insumo existente (Ej: si sube el precio del papel)
const actualizarInsumo = async (id, nombre, categoria, costo_unitario, precio_venta) => {
    const query = 'UPDATE insumos SET nombre = ?, categoria = ?, costo_unitario = ?, precio_venta = ? WHERE id_insumo = ?';
    const [result] = await db.query(query, [nombre, categoria, costo_unitario, precio_venta, id]);
    return result.affectedRows > 0;
};

// Eliminar un insumo
const eliminarInsumo = async (id) => {
    const [result] = await db.query('DELETE FROM insumos WHERE id_insumo = ?', [id]);
    return result.affectedRows > 0;
};

module.exports = {
    obtenerInsumos,
    obtenerInsumoPorId,
    crearInsumo,
    actualizarInsumo,
    eliminarInsumo
};