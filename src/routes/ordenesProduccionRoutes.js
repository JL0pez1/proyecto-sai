const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ordenesProduccionController');
const { verificarToken } = require('../middlewares/authMiddleware');

const permisoVer  = (req, res, next) => {
    const id_rol = parseInt(req.usuario && req.usuario.id_rol);
    if ([1,2,3].includes(id_rol)) return next();
    return res.status(403).json({ exito: false, mensaje: 'No tienes permiso para ver Producción' });
};
const permisoEditar = (req, res, next) => {
    const id_rol = parseInt(req.usuario && req.usuario.id_rol);
    if ([1,3].includes(id_rol)) return next();
    return res.status(403).json({ exito: false, mensaje: 'No tienes permiso para modificar Producción' });
};

// Listado y detalle
router.get('/', verificarToken, permisoVer, async (req, res) => {
    try {
        const datos = await ctrl.listarOrdenes();
        res.json({ exito: true, datos });
    } catch (e) { res.status(500).json({ exito: false, mensaje: e.message }); }
});

router.get('/:id', verificarToken, permisoVer, async (req, res) => {
    try {
        const datos = await ctrl.obtenerOrden(req.params.id);
        if (!datos) return res.status(404).json({ exito: false, mensaje: 'Orden no encontrada' });
        res.json({ exito: true, datos });
    } catch (e) { res.status(500).json({ exito: false, mensaje: e.message }); }
});

// Creación desde cotización aceptada (normalmente la llama el controlador de cotizaciones)
router.post('/cotizacion/:id', verificarToken, permisoEditar, async (req, res) => {
    try {
        const id_orden = await ctrl.crearDesdeCotizacion(req.params.id);
        res.json({ exito: true, id_orden });
    } catch (e) { res.status(500).json({ exito: false, mensaje: e.message }); }
});

// Prioridad y asignación de máquina/operador
router.patch('/:id/prioridad', verificarToken, permisoEditar, async (req, res) => {
    try {
        await ctrl.cambiarPrioridad(req.params.id, req.body.prioridad);
        res.json({ exito: true });
    } catch (e) { res.status(500).json({ exito: false, mensaje: e.message }); }
});

router.post('/:id/asignacion', verificarToken, permisoEditar, async (req, res) => {
    try {
        await ctrl.asignarMaquinaOperador(req.params.id, req.body.id_maquina, req.body.id_usuario_operador);
        res.json({ exito: true });
    } catch (e) { res.status(500).json({ exito: false, mensaje: e.message }); }
});

// Cronómetro
router.post('/:id/cronometro/iniciar', verificarToken, permisoEditar, async (req, res) => {
    try {
        const r = await ctrl.iniciarCronometro(req.params.id, req.usuario.id_usuario, req.body.observaciones);
        res.json(r);
    } catch (e) { res.status(500).json({ exito: false, mensaje: e.message }); }
});

router.post('/:id/cronometro/pausar', verificarToken, permisoEditar, async (req, res) => {
    try {
        const r = await ctrl.pausarCronometro(req.params.id, req.usuario.id_usuario, req.body.motivo);
        res.json(r);
    } catch (e) { res.status(500).json({ exito: false, mensaje: e.message }); }
});

router.post('/:id/cronometro/reanudar', verificarToken, permisoEditar, async (req, res) => {
    try {
        const r = await ctrl.reanudarCronometro(req.params.id, req.usuario.id_usuario);
        res.json(r);
    } catch (e) { res.status(500).json({ exito: false, mensaje: e.message }); }
});

router.post('/:id/cronometro/finalizar', verificarToken, permisoEditar, async (req, res) => {
    try {
        const r = await ctrl.finalizarCronometro(req.params.id, req.usuario.id_usuario);
        res.json(r);
    } catch (e) { res.status(500).json({ exito: false, mensaje: e.message }); }
});

router.post('/:id/entregado', verificarToken, permisoEditar, async (req, res) => {
    try {
        const r = await ctrl.marcarEntregado(req.params.id, req.usuario.id_usuario);
        res.json(r);
    } catch (e) { res.status(500).json({ exito: false, mensaje: e.message }); }
});

// Consumo real de insumos
router.post('/:id/consumo', verificarToken, permisoEditar, async (req, res) => {
    try {
        const { id_insumo, cantidad_real, cantidad_estimada } = req.body;
        const r = await ctrl.registrarConsumoInsumo(req.params.id, id_insumo, cantidad_real, cantidad_estimada);
        res.json(r);
    } catch (e) { res.status(500).json({ exito: false, mensaje: e.message }); }
});

// Notificaciones internas (propias del usuario logueado)
router.get('/notificaciones/mias', verificarToken, async (req, res) => {
    try {
        const datos = await ctrl.listarNotificaciones(req.usuario.id_usuario);
        res.json({ exito: true, datos });
    } catch (e) { res.status(500).json({ exito: false, mensaje: e.message }); }
});

router.patch('/notificaciones/:id/leida', verificarToken, async (req, res) => {
    try {
        await ctrl.marcarNotificacionLeida(req.params.id, req.usuario.id_usuario);
        res.json({ exito: true });
    } catch (e) { res.status(500).json({ exito: false, mensaje: e.message }); }
});

module.exports = router;
