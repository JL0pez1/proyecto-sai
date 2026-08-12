const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();

// Middlewares base
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Conexión a la base de datos
const db = require('./src/config/db');

// ==========================================
// IMPORTACIÓN DE RUTAS
// ==========================================
const userRoutes             = require('./src/routes/userRoutes');
const authRoutes             = require('./src/routes/authRoutes');
const insumoRoutes           = require('./src/routes/insumoRoutes');
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
iniciarRevisionRetrasos();

// Levantamos el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});