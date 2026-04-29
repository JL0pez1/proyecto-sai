const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ exito: false, mensaje: 'No se proporcionó un token' });
    }

    try {
        // El token viene como "Bearer TOKEN", así que quitamos el "Bearer "
        const tokenLimpio = token.split(' ')[1];
        const decodificado = jwt.verify(tokenLimpio, process.env.JWT_SECRET);
        req.usuario = decodificado;
        next(); // ¡Todo bien! Puede pasar al controlador
    } catch (error) {
        return res.status(401).json({ exito: false, mensaje: 'Token inválido o expirado' });
    }
};

module.exports = { verificarToken };