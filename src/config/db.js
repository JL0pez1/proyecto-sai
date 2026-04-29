const mysql = require('mysql2/promise');
require('dotenv').config();

// Creamos un "Pool" de conexiones (más eficiente que una conexión única)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Probamos la conexión al iniciar
pool.getConnection()
    .then(connection => {
        console.log('✅ Conexión exitosa a la base de datos de SAI');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Error conectando a la base de datos:', err.message);
    });

module.exports = pool;