const db = require('../config/db');

// Función para obtener todos los usuarios con su respectivo rol
const obtenerUsuarios = async () => {
    // CAMBIO CLAVE: Usamos LEFT JOIN en lugar de INNER JOIN. 
    // Así aseguramos que los usuarios aparezcan incluso si hay un error con su rol.
    const query = `
        SELECT u.id_usuario, u.nombre_completo, u.correo, u.estado, r.nombre AS rol 
        FROM usuarios u
        LEFT JOIN roles r ON u.id_rol = r.id_rol;
    `;
    
    // Ejecutamos la consulta. Destructuramos [rows] para obtener solo los datos.
    const [rows] = await db.query(query);
    return rows;
};

// Buscar un usuario por su correo (Para el Login)
const buscarUsuarioPorCorreo = async (correo) => {
    const query = 'SELECT * FROM usuarios WHERE correo = ?';
    const [rows] = await db.query(query, [correo]);
    return rows[0]; // Retorna el primer usuario encontrado o undefined
};

// Crear un nuevo usuario (Para el Registro)
const crearUsuario = async (id_rol, nombre_completo, correo, password_encriptada) => {
    const query = 'INSERT INTO usuarios (id_rol, nombre_completo, correo, password) VALUES (?, ?, ?, ?)';
    const [result] = await db.query(query, [id_rol, nombre_completo, correo, password_encriptada]);
    return result.insertId; // Retorna el ID del nuevo usuario
};

// Actualizar el nombre y rol de un usuario
const actualizarUsuario = async (id_usuario, nombre_completo, id_rol) => {
    const query = 'UPDATE usuarios SET nombre_completo = ?, id_rol = ? WHERE id_usuario = ?';
    const [result] = await db.query(query, [nombre_completo, id_rol, id_usuario]);
    return result.affectedRows > 0;
};

// Cambiar el estado a "Inactivo" (Borrado Lógico)
const desactivarUsuario = async (id_usuario) => {
    const query = 'UPDATE usuarios SET estado = "Inactivo" WHERE id_usuario = ?';
    const [result] = await db.query(query, [id_usuario]);
    return result.affectedRows > 0;
};

// Actualizar contraseña (Reinicio)
const cambiarPassword = async (id_usuario, passwordEncriptada) => {
    const query = 'UPDATE usuarios SET password = ? WHERE id_usuario = ?';
    const [result] = await db.query(query, [passwordEncriptada, id_usuario]);
    return result.affectedRows > 0;
};

module.exports = {
    obtenerUsuarios,
    buscarUsuarioPorCorreo,
    crearUsuario,
    actualizarUsuario,
    desactivarUsuario,
    cambiarPassword 
};