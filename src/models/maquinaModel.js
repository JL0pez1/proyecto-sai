const db = require('../config/db');

const listarMaquinas = async () => {
    const [rows] = await db.query('SELECT * FROM maquinas ORDER BY nombre');
    return rows;
};

const crearMaquina = async (nombre, tipo, precio_por_hora) => {
    const [result] = await db.query(
        `INSERT INTO maquinas (nombre, tipo, estado, precio_por_hora) VALUES (?, ?, 'Disponible', ?)`,
        [nombre, tipo, precio_por_hora]
    );
    return result.insertId;
};

const actualizarMaquina = async (id, nombre, tipo, precio_por_hora) => {
    const [result] = await db.query(
        `UPDATE maquinas SET nombre = ?, tipo = ?, precio_por_hora = ? WHERE id_maquina = ?`,
        [nombre, tipo, precio_por_hora, id]
    );
    return result.affectedRows > 0;
};

const cambiarEstadoMaquina = async (id, estado) => {
    const [result] = await db.query(
        `UPDATE maquinas SET estado = ? WHERE id_maquina = ?`, [estado, id]
    );
    return result.affectedRows > 0;
};

module.exports = { listarMaquinas, crearMaquina, actualizarMaquina, cambiarEstadoMaquina };