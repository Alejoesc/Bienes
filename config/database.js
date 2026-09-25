const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bienes_bcv',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

pool.getConnection((err, connection) => {
    if (err) { console.error('Error al conectar con la base de datos MySQL:', err.message); } 
    else { console.log(`¡Conexión exitosa a la base de datos MySQL!`); connection.release(); }
});

module.exports = promisePool;