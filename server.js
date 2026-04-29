const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Inicializamos express
const app = express();

// Middlewares (Configuraciones base)
app.use(cors());
app.use(express.json()); // Para que Node entienda datos en formato JSON

// Importamos la conexión a la base de datos
const db = require('./src/config/db');

// ==========================================
// 1. IMPORTACIÓN DE RUTAS (Aquí estaba el detalle)
// ==========================================
const userRoutes = require('./src/routes/userRoutes');
const authRoutes = require('./src/routes/authRoutes');
const insumoRoutes = require('./src/routes/insumoRoutes');
const clienteRoutes = require('./src/routes/clienteRoutes');
// ==========================================
// 2. USO DE RUTAS (Endpoints)
// ==========================================
app.use('/api/usuarios', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/insumos', insumoRoutes);
app.use('/api/clientes', clienteRoutes);
// Ruta de prueba base
app.get('/', (req, res) => {
    res.send('🚀 Servidor del Sistema SAI funcionando correctamente');
});

// Levantamos el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});