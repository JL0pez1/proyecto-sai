const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs'); // Asegúrate de que coincida con la librería que usaste en authController


const listarUsuarios = async (req, res) => {
    try {
        // Llamamos al modelo para obtener los datos
        const usuarios = await userModel.obtenerUsuarios();
        
        // Respondemos con un estado 200 (Éxito) y los datos en formato JSON
        res.status(200).json({
            exito: true,
            mensaje: 'Usuarios obtenidos correctamente',
            datos: usuarios
        });
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        // Respondemos con un estado 500 (Error interno del servidor)
        res.status(500).json({
            exito: false,
            mensaje: 'Hubo un error al comunicarse con la base de datos'
        });
    }
};

const actualizarUsuario = async (req, res) => {
    const { id } = req.params;
    const { nombre_completo, id_rol } = req.body;
console.log("Datos recibidos para actualizar:", { id, nombre_completo, id_rol });

    try {
        const actualizado = await userModel.actualizarUsuario(id, nombre_completo, id_rol);
        if (actualizado) {
            res.status(200).json({ exito: true, mensaje: 'Usuario actualizado correctamente' });
        } else {
            res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
    }
};

const desactivarUsuario = async (req, res) => {
    const { id } = req.params;

    try {
        const desactivado = await userModel.desactivarUsuario(id);
        if (desactivado) {
            res.status(200).json({ exito: true, mensaje: 'Usuario desactivado correctamente' });
        } else {
            res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error al desactivar usuario:', error);
        res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
    }
};



// Agrega esta nueva función:
const reiniciarPassword = async (req, res) => {
    const { id } = req.params;
    const { nuevaPassword } = req.body;

    if (!nuevaPassword || nuevaPassword.length < 6) {
        return res.status(400).json({ exito: false, mensaje: 'La contraseña debe tener al menos 6 caracteres' });
    }

    try {
        // Encriptamos la nueva contraseña igual que en el registro
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(nuevaPassword, salt);

        const actualizado = await userModel.cambiarPassword(id, passwordEncriptada);
        
        if (actualizado) {
            res.status(200).json({ exito: true, mensaje: 'Contraseña reiniciada con éxito' });
        } else {
            res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error al reiniciar password:', error);
        res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
    }
};
module.exports = {
    listarUsuarios,
    actualizarUsuario, // Nueva
    desactivarUsuario,  
    reiniciarPassword 
};