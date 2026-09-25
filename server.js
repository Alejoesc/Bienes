const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./config/database');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

const authController = require('./controllers/authController');
const usersController = require('./controllers/usersController');
const assetsController = require('./controllers/assetsController');
const systemController = require('./controllers/systemController');
const finanzasController = require('./controllers/finanzasController');
const licenciasController = require('./controllers/licenciasController');
const transferController = require('./controllers/transferController');

const { auth, checkRole } = require('./middlewares/authMiddleware');
const { registrarAuditoria } = require('./utils/audit');

async function verificarYCrearEstructura() {
    try {
        await db.query(`CREATE TABLE IF NOT EXISTS departamentos (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(100) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;`);
        await db.query(`CREATE TABLE IF NOT EXISTS usuarios (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(100) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, role VARCHAR(50) DEFAULT 'viewer', nombre VARCHAR(100), departamento VARCHAR(100), cedula VARCHAR(30), correo VARCHAR(150), permisos TEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;`);
        await db.query(`CREATE TABLE IF NOT EXISTS bienes (id INT AUTO_INCREMENT PRIMARY KEY, codigo_bien VARCHAR(50) NOT NULL, codigo VARCHAR(50), descripcion TEXT NOT NULL, serial VARCHAR(100), departamento VARCHAR(100), responsable VARCHAR(150) DEFAULT 'General', estado VARCHAR(50) DEFAULT 'Activo', valor DECIMAL(12,2) DEFAULT 0.00, imagenes LONGTEXT, fecha_incorporacion DATE, fecha_desincorporacion DATE, fecha_enajenacion DATE, estatus VARCHAR(50) DEFAULT 'Activo') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;`);
        await db.query(`CREATE TABLE IF NOT EXISTS compras (id INT AUTO_INCREMENT PRIMARY KEY, solicitante VARCHAR(100), departamento VARCHAR(100), descripcion TEXT, justificacion TEXT, presupuesto DECIMAL(12,2) DEFAULT 0.00, link_referencia VARCHAR(255), foto_adjunta VARCHAR(255), factura_adjunta VARCHAR(255), estado VARCHAR(50) DEFAULT 'Pendiente Supervisor', estatus VARCHAR(50) DEFAULT 'Pendiente Supervisor', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;`);
        await db.query(`CREATE TABLE IF NOT EXISTS licencias (id INT AUTO_INCREMENT PRIMARY KEY, software VARCHAR(150) NOT NULL, serial VARCHAR(100), tipo VARCHAR(50), fecha_vencimiento DATE, departamento VARCHAR(100), estatus VARCHAR(50) DEFAULT 'Activa') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;`);
        await db.query(`CREATE TABLE IF NOT EXISTS auditoria (id INT AUTO_INCREMENT PRIMARY KEY, usuario VARCHAR(100) DEFAULT 'Sistema', accion VARCHAR(100) NOT NULL, detalle TEXT, ip VARCHAR(50) DEFAULT '127.0.0.1', mac VARCHAR(50) DEFAULT 'Windows PC', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;`);
        await db.query(`CREATE TABLE IF NOT EXISTS enajenaciones (id INT AUTO_INCREMENT PRIMARY KEY, bien_id INT NOT NULL, motivo TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (bien_id) REFERENCES bienes(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;`);
        await db.query(`CREATE TABLE IF NOT EXISTS traspasos (id INT AUTO_INCREMENT PRIMARY KEY, bien_id INT NOT NULL, depto_origen VARCHAR(100), depto_destino VARCHAR(100), solicitante VARCHAR(100), estado VARCHAR(50) DEFAULT 'Pendiente', fecha_resolucion TIMESTAMP NULL, FOREIGN KEY (bien_id) REFERENCES bienes(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;`);
        console.log("¡Estructura de base de datos OK!");
    } catch (err) { console.error("Error BD:", err.message); }
}

app.post('/api/login', authController.login);
app.post('/api/logout', auth, authController.logout);
app.get('/api/bienes', auth, assetsController.getAll);
app.post('/api/bienes', auth, assetsController.create);
app.get('/api/stats', auth, assetsController.getStats);
app.get('/api/desincorporados', auth, checkRole(['admin']), assetsController.getDesincorporados);
app.post('/api/desincorporar/:id', auth, checkRole(['admin', 'editor']), assetsController.desincorporar);
app.post('/api/enajenar', auth, checkRole(['admin']), assetsController.enajenarBien);
app.post('/api/traspasar', auth, checkRole(['admin']), assetsController.traspasarBien);
app.get('/api/compras', auth, finanzasController.getCompras);
app.post('/api/compras', auth, upload.single('foto'), finanzasController.createCompra);
app.put('/api/compras/:id/aprobar-sup', auth, checkRole(['editor', 'admin']), finanzasController.aprobarSup);
app.put('/api/compras/:id/aprobar-compra', auth, checkRole(['admin']), upload.single('factura'), finanzasController.aprobarCompra);
app.put('/api/compras/:id/rechazar', auth, checkRole(['editor', 'admin']), finanzasController.rechazarCompra);
app.get('/api/contabilidad', auth, checkRole(['admin']), finanzasController.getContabilidad);
app.get('/api/licencias', auth, licenciasController.getAll);
app.post('/api/licencias', auth, checkRole(['admin', 'editor']), licenciasController.create);
app.put('/api/licencias/:id/retirar', auth, checkRole(['admin', 'editor']), licenciasController.retirarLicencia);
app.put('/api/licencias/:id/renovar', auth, checkRole(['admin', 'editor']), licenciasController.renovarLicencia);
app.delete('/api/licencias/:id', auth, checkRole(['admin']), licenciasController.delete);
app.get('/api/usuarios', auth, usersController.getAll);
app.post('/api/usuarios', auth, checkRole(['admin']), usersController.create);
app.put('/api/usuarios/:id', auth, checkRole(['admin']), usersController.update);
app.get('/api/notificaciones', auth, transferController.getNotifications);
app.post('/api/traspasos/solicitar', auth, transferController.requestTransfer);
app.put('/api/traspasos/:id/:action', auth, checkRole(['admin']), transferController.resolveTransfer);
app.get('/api/export/bienes', auth, systemController.exportBienes);
app.post('/api/import/bienes', auth, checkRole(['admin']), upload.single('file'), systemController.importBienes);
app.get('/api/backup', auth, checkRole(['admin']), systemController.createBackup);
app.post('/api/restore', auth, checkRole(['admin']), upload.single('file'), systemController.restoreBackup);
app.get('/api/auditoria', auth, checkRole(['admin']), systemController.getAuditoria);
app.post('/api/auditoria/log', auth, async (req, res) => { await registrarAuditoria(req, req.body.accion, req.body.detalle); res.json({ success: true }); });
app.get('/api/departamentos', auth, systemController.getDepartamentos);
app.post('/api/departamentos', auth, checkRole(['admin']), systemController.createDepartamento);
app.delete('/api/departamentos/:id', auth, checkRole(['admin']), systemController.deleteDepartamento);

app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    await verificarYCrearEstructura();
    console.log(`SGBN Servidor en línea en el puerto ${PORT}`);
});