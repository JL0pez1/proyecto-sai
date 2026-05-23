const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares base
app.use(cors());
app.use(express.json());

// Conexión a la base de datos
const db = require('./src/config/db');

// ==========================================
// IMPORTACIÓN DE RUTAS
// ==========================================
const userRoutes        = require('./src/routes/userRoutes');
const authRoutes        = require('./src/routes/authRoutes');
const insumoRoutes      = require('./src/routes/insumoRoutes');
const clienteRoutes     = require('./src/routes/clienteRoutes');
const cotizacionRoutes  = require('./src/routes/cotizacionRoutes'); // NUEVO

// ==========================================
// USO DE RUTAS (Endpoints)
// ==========================================
app.use('/api/usuarios',     userRoutes);
app.use('/api/auth',         authRoutes);
app.use('/api/insumos',      insumoRoutes);
app.use('/api/clientes',     clienteRoutes);
app.use('/api/cotizaciones', cotizacionRoutes); // NUEVO

// Ruta de prueba base
app.get('/', (req, res) => {
    res.send('🚀 Servidor del Sistema SAI funcionando correctamente');
});

// Levantamos el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});