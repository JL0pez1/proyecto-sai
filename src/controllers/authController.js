const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

// Función para registrar un usuario nuevo
const registrar = async (req, res) => {
    const { id_rol, nombre_completo, correo, password } = req.body;

    try {
        // 1. Verificar si el correo ya existe
        const usuarioExistente = await userModel.buscarUsuarioPorCorreo(correo);
        if (usuarioExistente) {
            return res.status(400).json({ exito: false, mensaje: 'El correo ya está registrado' });
        }

        // 2. Encriptar la contraseña (hashing)
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(password, salt);

        // 3. Guardar en la base de datos
        const nuevoId = await userModel.crearUsuario(id_rol, nombre_completo, correo, passwordEncriptada);

        res.status(201).json({ exito: true, mensaje: 'Usuario registrado con éxito', id_usuario: nuevoId });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al registrar usuario' });
    }
};

// Función para iniciar sesión
const login = async (req, res) => {
    const { correo, password } = req.body;

    try {
        // 1. Buscar al usuario por correo
        const usuario = await userModel.buscarUsuarioPorCorreo(correo);
        if (!usuario) {
            return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
        }

        // 2. Comparar la contraseña ingresada con la encriptada
        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) {
            return res.status(401).json({ exito: false, mensaje: 'Contraseña incorrecta' });
        }

        // 3. Generar el Token JWT (Válido por 8 horas)
        const token = jwt.sign(
            { id_usuario: usuario.id_usuario, id_rol: usuario.id_rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // 4. Enviar respuesta exitosa con el token
        res.status(200).json({
            exito: true,
            mensaje: 'Inicio de sesión exitoso',
            token: token,
            usuario: {
                id: usuario.id_usuario,
                nombre: usuario.nombre_completo,
                correo: usuario.correo
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al iniciar sesión' });
    }
};

module.exports = {
    registrar,
    login
};