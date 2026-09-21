const db = require('../config/database');
const { registrarAuditoria } = require('../utils/audit');

exports.getAll = async (req, res) => {
    try { const [rows] = await db.query("SELECT * FROM bienes WHERE estatus = 'Activo' OR estado = 'Activo' OR estatus IS NULL"); res.json(rows); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
    try {
        const { codigo_bien, descripcion, serial, departamento, valor, imagenes } = req.body;
        
        // Convertir el arreglo de imágenes (Base64) a un string JSON para guardarlo en la BD
        const imagenesJson = (imagenes && imagenes.length > 0) ? JSON.stringify(imagenes) : null;

        await db.query(
            "INSERT INTO bienes (codigo_bien, codigo, descripcion, serial, departamento, estado, valor, imagenes, fecha_incorporacion, estatus) VALUES (?, ?, ?, ?, ?, 'Activo', ?, ?, CURDATE(), 'Activo')", 
            [codigo_bien, codigo_bien, descripcion, serial, departamento, valor || 0.00, imagenesJson]
        );
        
        res.json({ success: true });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

exports.getStats = async (req, res) => {
    try {
        const [activos] = await db.query("SELECT COUNT(*) as total FROM bienes WHERE estatus = 'Activo' OR estado = 'Activo' OR estatus IS NULL");
        const [desincorporados] = await db.query("SELECT COUNT(*) as total FROM bienes WHERE estatus = 'Desincorporado' OR estado = 'Desincorporado'");
        const [enajenados] = await db.query("SELECT COUNT(*) as total FROM bienes WHERE estatus = 'Enajenado' OR estado = 'Enajenado'");
        res.json({ totalActivos: activos[0].total || 0, asignadosDisponibles: activos[0].total || 0, desincorporados: desincorporados[0].total || 0, enajenados: enajenados[0].total || 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getDesincorporados = async (req, res) => {
    try { 
        // Esta consulta captura de forma unificada todos los bienes desincorporados o enajenados para alimentar ambas tablas correctamente
        const [rows] = await db.query(`
            SELECT b.*, MAX(e.motivo) as motivo_enajenacion 
            FROM bienes b 
            LEFT JOIN enajenaciones e ON b.id = e.bien_id 
            WHERE b.estatus IN ('Desincorporado', 'Enajenado', 'DESINCORPORADO', 'ENAJENADO') 
               OR b.estado IN ('Desincorporado', 'Enajenado', 'DESINCORPORADO', 'ENAJENADO') 
            GROUP BY b.id
            ORDER BY b.codigo_bien ASC
        `); 
        res.json(rows); 
    } 
    catch (err) { res.status(500).json({ error: err.message }); }
};

exports.desincorporar = async (req, res) => {
    try { 
        // Actualizamos ambos campos (estatus y estado) para que el módulo de enajenación los detecte instantáneamente en pendientes
        await db.query("UPDATE bienes SET estado = 'Desincorporado', estatus = 'Desincorporado', fecha_desincorporacion = CURDATE() WHERE id = ?", [req.params.id]); 
        res.json({ success: true }); 
    } 
    catch (err) { res.status(500).json({ error: err.message }); }
};

exports.enajenarBien = async (req, res) => {
    try {
        const { id, motivo } = req.body;
        await db.query("UPDATE bienes SET estado = 'Enajenado', estatus = 'Enajenado', fecha_enajenacion = CURDATE() WHERE id = ?", [id]);
        
        const [existing] = await db.query("SELECT id FROM enajenaciones WHERE bien_id = ?", [id]);
        if (existing.length > 0) {
            await db.query("UPDATE enajenaciones SET motivo = ? WHERE bien_id = ?", [motivo, id]);
        } else {
            await db.query("INSERT INTO enajenaciones (bien_id, motivo) VALUES (?, ?)", [id, motivo]);
        }

        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.traspasarBien = async (req, res) => {
    try {
        const { id, departamento_destino } = req.body;
        await db.query("UPDATE bienes SET departamento = ? WHERE id = ?", [departamento_destino, id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};