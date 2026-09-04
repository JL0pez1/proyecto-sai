const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
require('dotenv').config();
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// Middlewares base
app.use(cors());
app.use(express.json());
app.use('/socket.io-client', express.static(path.join(__dirname, 'node_modules/socket.io-client/dist')));
app.use(express.static('public'));

io.use((socket, next) => {
    try {
        const token = socket.handshake.auth && socket.handshake.auth.token;
        if (!token) return next(new Error('No se proporcionó un token'));
        socket.usuario = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        next(new Error('Token inválido o expirado'));
    }
});

io.on('connection', (socket) => {
    socket.join('sai');
});

app.use((req, res, next) => {
    const esMutacion = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    if (!esMutacion || !req.path.startsWith('/api/')) return next();

    res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            io.to('sai').emit('datos:actualizados', {
                metodo: req.method,
                ruta: req.originalUrl,
                usuarioId: req.usuario?.id_usuario || null,
                fecha: new Date().toISOString()
            });
        }
    });
    next();
});

// Conexión a la base de datos
const db = require('./src/config/db');

// ==========================================
// IMPORTACIÓN DE RUTAS
// ==========================================
const userRoutes             = require('./src/routes/userRoutes');
const authRoutes             = require('./src/routes/authRoutes');
const insumoRoutes           = require('./src/routes/insumoRoutes');
const maquinaRoutes          = require('./src/routes/maquinaRoutes');
const clienteRoutes          = require('./src/routes/clienteRoutes');
const cotizacionRoutes       = require('./src/routes/cotizacionRoutes');
const produccionRoutes       = require('./src/routes/produccionRoutes');       // Sistema viejo (tabla 'produccion') — se mantiene hasta migrar el frontend
const ordenesProduccionRoutes = require('./src/routes/ordenesProduccionRoutes'); // Sistema nuevo (tablas ordenes_produccion, tiempos_produccion, etc.)

// ==========================================
// USO DE RUTAS (Endpoints)
// ==========================================
app.use('/api/usuarios',          userRoutes);
app.use('/api/auth',              authRoutes);
app.use('/api/insumos',           insumoRoutes);
app.use('/api/maquinas',           maquinaRoutes);
app.use('/api/clientes',          clienteRoutes);
app.use('/api/cotizaciones',      cotizacionRoutes);
app.use('/api/produccion',        produccionRoutes);
app.use('/api/ordenes-produccion', ordenesProduccionRoutes);

// Ruta de prueba base
app.get('/', (req, res) => {
    res.send('🚀 Servidor del Sistema SAI funcionando correctamente');
});

// ==========================================
// TRABAJOS EN SEGUNDO PLANO
// ==========================================
const { iniciarRevisionRetrasos } = require('./src/jobs/alertasRetrasos');
const { prepararEsquemaOrdenes } = require('./src/controllers/ordenesProduccionController');

// Levantamos el servidor HTTP junto con Socket.IO
const PORT = process.env.PORT || 3000;
(async () => {
    try {
        await prepararEsquemaOrdenes();
        iniciarRevisionRetrasos();
        httpServer.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Error preparando órdenes de producción:', error.message);
        process.exit(1);
    }
})();