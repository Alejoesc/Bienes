const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bienes_bcv',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error al conectar con la base de datos MySQL:', err.message);
    } else {
        console.log('¡Conexión exitosa a la base de datos MySQL (bienes_bcv)!');
        connection.release();
    }
});

module.exports = promisePool;