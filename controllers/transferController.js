const db = require('../config/database');
const { registrarAuditoria } = require('../utils/audit');

exports.requestTransfer = async (req, res) => {
    const { bien_id, depto_destino } = req.body;
    try {
        const [bien] = await db.query("SELECT departamento, codigo_bien FROM bienes WHERE id = ?", [bien_id]);
        if(bien.length === 0) return res.status(404).json({ error: "Bien no encontrado." });
        
        const solicitante = req.user ? (req.user.nombre || req.user.username) : 'Sistema';

        await db.query(
            "INSERT INTO traspasos (bien_id, depto_origen, depto_destino, solicitante, estado) VALUES (?, ?, ?, ?, 'Pendiente')",
            [bien_id, bien[0].departamento, depto_destino, solicitante]
        );

        await registrarAuditoria(req, 'SOLICITUD_TRASPASO', `Solicitud de traspaso del bien ${bien[0].codigo_bien} hacia ${depto_destino}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT t.*, b.codigo_bien, b.descripcion FROM traspasos t JOIN bienes b ON t.bien_id = b.id WHERE t.estado = 'Pendiente' ORDER BY t.id DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.resolveTransfer = async (req, res) => {
    const { id, action } = req.params;
    try {
        const estado = action === 'aprobar' ? 'Aprobado' : 'Rechazado';
        let detalleAuditoria = `Traspaso #${id} ${estado.toLowerCase()}`;

        if (estado === 'Aprobado') {
            const [traspaso] = await db.query("SELECT * FROM traspasos WHERE id = ?", [id]);
            if (traspaso.length > 0) {
                await db.query("UPDATE bienes SET departamento = ? WHERE id = ?", [traspaso[0].depto_destino, traspaso[0].bien_id]);
                detalleAuditoria += ` (Bien movido a ${traspaso[0].depto_destino})`;
            }
        }
        await db.query("UPDATE traspasos SET estado = ?, fecha_resolucion = CURRENT_TIMESTAMP() WHERE id = ?", [estado, id]);
        
        await registrarAuditoria(req, 'RESOLUCION_TRASPASO', detalleAuditoria);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};