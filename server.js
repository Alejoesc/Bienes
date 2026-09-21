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
const upload = multer({ 
    storage,
    limits: { fileSize: 100 * 1024 * 1024 } 
});

const authController = require('./controllers/authController');
const usersController = require('./controllers/usersController');
const assetsController = require('./controllers/assetsController');
const systemController = require('./controllers/systemController');
const finanzasController = require('./controllers/finanzasController');
const licenciasController = require('./controllers/licenciasController');
const transferController = require('./controllers/transferController');

const { auth, checkRole } = require('./middlewares/authMiddleware');
const { registrarAuditoria } = require('./utils/audit');

// Auto-Generador, Verificador y Poblador de Datos
async function verificarYCrearEstructura() {
    try {
        await db.query(`CREATE TABLE IF NOT EXISTS departamentos (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(100) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;`);
        await db.query(`CREATE TABLE IF NOT EXISTS usuarios (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(100) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, role VARCHAR(50) DEFAULT 'viewer', nombre VARCHAR(100), departamento VARCHAR(100), cedula VARCHAR(30), correo VARCHAR(150), permisos TEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;`);
        
        // CORRECCIÓN APLICADA: Se agregó "imagenes LONGTEXT" para guardar las fotografías de los bienes
        await db.query(`CREATE TABLE IF NOT EXISTS bienes (id INT AUTO_INCREMENT PRIMARY KEY, codigo_bien VARCHAR(50) NOT NULL, codigo VARCHAR(50), descripcion TEXT NOT NULL, serial VARCHAR(100), departamento VARCHAR(100), estado VARCHAR(50) DEFAULT 'Activo', valor DECIMAL(12,2) DEFAULT 0.00, imagenes LONGTEXT, fecha_incorporacion DATE, fecha_desincorporacion DATE, fecha_enajenacion DATE, estatus VARCHAR(50) DEFAULT 'Activo') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;`);
        
        await db.query(`CREATE TABLE IF NOT EXISTS compras (id INT AUTO_INCREMENT PRIMARY KEY, solicitante VARCHAR(100), departamento VARCHAR(100), descripcion TEXT, justificacion TEXT, presupuesto DECIMAL(12,2) DEFAULT 0.00, link_referencia VARCHAR(255), foto_adjunta VARCHAR(255), factura_adjunta VARCHAR(255), estado VARCHAR(50) DEFAULT 'Pendiente Supervisor', estatus VARCHAR(50) DEFAULT 'Pendiente Supervisor', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;`);
        await db.query(`CREATE TABLE IF NOT EXISTS licencias (id INT AUTO_INCREMENT PRIMARY KEY, software VARCHAR(150) NOT NULL, serial VARCHAR(100), tipo VARCHAR(50), fecha_vencimiento DATE, departamento VARCHAR(100), estatus VARCHAR(50) DEFAULT 'Activa') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;`);
        await db.query(`CREATE TABLE IF NOT EXISTS auditoria (id INT AUTO_INCREMENT PRIMARY KEY, usuario VARCHAR(100) DEFAULT 'Sistema', accion VARCHAR(100) NOT NULL, detalle TEXT, ip VARCHAR(50) DEFAULT '127.0.0.1', mac VARCHAR(50) DEFAULT 'Windows PC', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;`);
        await db.query(`CREATE TABLE IF NOT EXISTS enajenaciones (id INT AUTO_INCREMENT PRIMARY KEY, bien_id INT NOT NULL, motivo TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (bien_id) REFERENCES bienes(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;`);
        await db.query(`CREATE TABLE IF NOT EXISTS traspasos (id INT AUTO_INCREMENT PRIMARY KEY, bien_id INT NOT NULL, depto_origen VARCHAR(100), depto_destino VARCHAR(100), solicitante VARCHAR(100), estado VARCHAR(50) DEFAULT 'Pendiente', fecha_resolucion TIMESTAMP NULL, FOREIGN KEY (bien_id) REFERENCES bienes(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;`);
        
        console.log("¡Estructura de base de datos OK!");

        // Ejecutar semillero automático para asegurar mínimo 10 registros por módulo
        await poblarDatosMasivosSiEsNecesario();

    } catch (err) { console.error("Error BD:", err.message); }
}

async function poblarDatosMasivosSiEsNecesario() {
    try {
        // 1. Departamentos (10)
        const [deptos] = await db.query("SELECT COUNT(*) as c FROM departamentos");
        if (deptos[0].c < 10) {
            const dptosList = [
                'Tecnología e Informática', 'Recursos Humanos', 'Administración y Finanzas', 
                'Auditoría Interna', 'Servicios Generales', 'Seguridad Institucional', 
                'Legal y Jurídica', 'Operaciones', 'Planificación Estratégica', 'Comunicación y Prensa'
            ];
            for (let d of dptosList) {
                await db.query("INSERT IGNORE INTO departamentos (nombre) VALUES (?)", [d]);
            }
            console.log("-> 10 Departamentos asegurados.");
        }

        // 2. Usuarios (10 - incluyendo administrador)
        const [users] = await db.query("SELECT COUNT(*) as c FROM usuarios");
        if (users[0].c < 10) {
            await db.query(
                "INSERT IGNORE INTO usuarios (username, password, role, nombre, departamento, cedula, correo, permisos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ['admin', '123456', 'admin', 'Administrador Principal', 'Tecnología e Informática', 'V-00000000', 'admin@bcv.org.ve', JSON.stringify(['inventario', 'compras', 'licencias', 'contabilidad', 'enajenacion', 'auditoria', 'sistema'])]
            );
            const roles = ['editor', 'almacenista', 'contador', 'auditor', 'viewer'];
            const permisosAll = JSON.stringify(['inventario', 'compras', 'licencias']);
            for (let i = 2; i <= 10; i++) {
                await db.query(
                    "INSERT IGNORE INTO usuarios (username, password, role, nombre, departamento, cedula, correo, permisos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [`user${i}`, '123456', roles[i % roles.length], `Funcionario Pruebas ${i}`, 'Operaciones', `V-25${i}00392`, `user${i}@bcv.org.ve`, permisosAll]
                );
            }
            console.log("-> 10 Usuarios asegurados.");
        }

        // 3. Bienes (15 bienes para cubrir activos, desincorporados y enajenados)
        const [bienes] = await db.query("SELECT COUNT(*) as c FROM bienes");
        if (bienes[0].c < 10) {
            const descripciones = [
                'Laptop Corporativa Core i7', 'Computador de Escritorio OptiPlex', 'Impresora Láser Multifuncional',
                'Aire Acondicionado Split 18000 BTU', 'Escritorio Ejecutivo de Madera', 'Silla Ergonómica Operativa',
                'Video Beam Proyector HD', 'Servidor Rackable Xeon', 'Switch Administrable 24 Puertos',
                'Teléfono IP Cisco', 'Tablet Institucional de Inspección', 'Scanner de Alta Velocidad',
                'No-Break UPS 1500VA', 'Archivador Metálico 4 Gavetas', 'Pizarra Acrílica Magnetizada'
            ];
            for (let i = 0; i < descripciones.length; i++) {
                let estatusVal = 'Activo';
                let fechaDes = null;
                let fechaEnaj = null;
                if (i === 11) { estatusVal = 'Desincorporado'; fechaDes = new Date(); }
                if (i === 12) { estatusVal = 'Enajenado'; fechaDes = new Date(); fechaEnaj = new Date(); }

                await db.query(
                    "INSERT INTO bienes (codigo_bien, codigo, descripcion, serial, departamento, estado, valor, fecha_incorporacion, fecha_desincorporacion, fecha_enajenacion, estatus) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?)",
                    [`PAT-990${i+1}`, `PAT-990${i+1}`, descripciones[i], `SN-X990${i+1}ABC`, 'Tecnología e Informática', estatusVal, 450.00 + (i * 35), fechaDes, fechaEnaj, estatusVal]
                );
            }
            console.log("-> 15 Bienes asegurados.");
        }

        // 4. Compras (10)
        const [compras] = await db.query("SELECT COUNT(*) as c FROM compras");
        if (compras[0].c < 10) {
            for (let i = 1; i <= 10; i++) {
                await db.query(
                    "INSERT INTO compras (solicitante, departamento, descripcion, justificacion, presupuesto, estado, estatus) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [`Funcionario Pruebas ${i}`, 'Administración y Finanzas', `Adquisición de insumos lote ${i}`, `Reposición de material operativo ${i}`, 1200.50 * i, i % 2 === 0 ? 'Aprobado' : 'Pendiente Supervisor', i % 2 === 0 ? 'Completado' : 'Pendiente Supervisor']
                );
            }
            console.log("-> 10 Compras aseguradas.");
        }

        // 5. Licencias (10)
        const [licencias] = await db.query("SELECT COUNT(*) as c FROM licencias");
        if (licencias[0].c < 10) {
            const softwareList = ['Windows 11 Pro', 'Microsoft Office 365', 'Antivirus ESET', 'Adobe Acrobat DC', 'Visual Studio Enterprise', 'Oracle Database', 'AutoCAD 2026', 'VMware vSphere', 'Ubuntu Pro Server', 'Cisco Packet Tracer'];
            for (let i = 0; i < softwareList.length; i++) {
                await db.query(
                    "INSERT INTO licencias (software, serial, tipo, fecha_vencimiento, departamento, estatus) VALUES (?, ?, ?, DATE_ADD(CURDATE(), INTERVAL ? MONTH), ?, 'Activa')",
                    [softwareList[i], `LIC-KEY-2026-${i+1}99`, 'Anual Corporativa', i + 2, 'Tecnología e Informática']
                );
            }
            console.log("-> 10 Licencias aseguradas.");
        }

        // 6. Auditoría (10)
        const [auditoria] = await db.query("SELECT COUNT(*) as c FROM auditoria");
        if (auditoria[0].c < 10) {
            for (let i = 1; i <= 10; i++) {
                await db.query(
                    "INSERT INTO auditoria (usuario, accion, detalle, ip, mac) VALUES (?, ?, ?, ?, ?)",
                    ['admin', 'ACCION_PRUEBA', `Registro sintético de auditoría número ${i}`, '192.168.3.100', 'Linux Workstation']
                );
            }
            console.log("-> 10 Registros de auditoría asegurados.");
        }

        // 7. Enajenaciones (Asociadas a bienes desincorporados/enajenados)
        const [enajenaciones] = await db.query("SELECT COUNT(*) as c FROM enajenaciones");
        if (enajenaciones[0].c < 2) {
            const [bienesInactivos] = await db.query("SELECT id FROM bienes WHERE estado IN ('Desincorporado', 'Enajenado') LIMIT 2");
            for (let b of bienesInactivos) {
                await db.query("INSERT IGNORE INTO enajenaciones (bien_id, motivo) VALUES (?, ?)", [b.id, 'Baja y enajenación institucional aprobada']);
            }
            console.log("-> Enajenaciones aseguradas.");
        }

        // 8. Traspasos (10)
        const [traspasos] = await db.query("SELECT COUNT(*) as c FROM traspasos");
        if (traspasos[0].c < 10) {
            const [bienesActivos] = await db.query("SELECT id FROM bienes LIMIT 10");
            for (let b of bienesActivos) {
                await db.query(
                    "INSERT INTO traspasos (bien_id, depto_origen, depto_destino, solicitante, estado) VALUES (?, ?, ?, ?, ?)",
                    [b.id, 'Tecnología e Informática', 'Recursos Humanos', 'Administrador Principal', 'Pendiente']
                );
            }
            console.log("-> 10 Traspasos asegurados.");
        }

    } catch (err) {
        console.error("Error al poblar datos masivos:", err.message);
    }
}

// Rutas API
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

// Rutas de respaldo y restauración SQL
app.get('/api/backup', auth, checkRole(['admin']), systemController.createBackup);
app.post('/api/restore', auth, checkRole(['admin']), upload.single('file'), systemController.restoreBackup);

app.get('/api/auditoria', auth, checkRole(['admin']), systemController.getAuditoria);
app.post('/api/auditoria/log', auth, async (req, res) => { await registrarAuditoria(req, req.body.accion, req.body.detalle); res.json({ success: true }); });

app.get('/api/departamentos', auth, systemController.getDepartamentos);
app.post('/api/departamentos', auth, checkRole(['admin']), systemController.createDepartamento);
app.delete('/api/departamentos/:id', auth, checkRole(['admin']), systemController.deleteDepartamento);

app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(3000, async () => {
    await verificarYCrearEstructura();
    console.log('SGBN Servidor en línea en http://localhost:3000');
});