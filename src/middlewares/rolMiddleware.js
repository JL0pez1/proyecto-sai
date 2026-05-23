const db = require('../config/db');

const verificarPermiso = (permiso) => {
    return async (req, res, next) => {
        try {
            const { id_rol } = req.usuario;

            if (!id_rol) {
                return res.status(403).json({ exito: false, mensaje: 'No tienes un rol asignado' });
            }

            const [rows] = await db.query(
                'SELECT permisos FROM roles WHERE id_rol = ?',
                [id_rol]
            );

            if (rows.length === 0) {
                return res.status(403).json({ exito: false, mensaje: 'Rol no encontrado' });
            }

            let permisos = rows[0].permisos;
            if (typeof permisos === 'string') {
                try { permisos = JSON.parse(permisos); } catch (e) { permisos = {}; }
            }
            if (!permisos || typeof permisos !== 'object') permisos = {};

            if (permisos.all === true) return next();

            if (!permisos[permiso]) {
                return res.status(403).json({
                    exito: false,
                    mensaje: `No tienes permiso para acceder a: ${permiso}`
                });
            }

            next();
        } catch (error) {
            console.error('Error al verificar permisos:', error);
            res.status(500).json({ exito: false, mensaje: 'Error al verificar permisos' });
        }
    };
};

module.exports = { verificarPermiso };