const db = require('../config/database');

exports.getAll = async (req, res) => {
    try { 
        const [rows] = await db.query("SELECT * FROM bienes ORDER BY id DESC"); 
        res.json(rows); 
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

exports.create = async (req, res) => {
    try {
        const { 
            codigo_institucional, 
            codigo_patrimonial, 
            descripcion, 
            serial, 
            marca, 
            modelo, 
            fecha_adquisicion, 
            factura, 
            depreciacion, 
            departamento, 
            responsable, 
            valor, 
            imagenes 
        } = req.body;

        const imagenesJson = (imagenes && Array.isArray(imagenes) && imagenes.length > 0) ? JSON.stringify(imagenes) : null;
        const fechaAdqVal = (fecha_adquisicion && fecha_adquisicion.trim() !== '') ? fecha_adquisicion : null;

        await db.query(
            `INSERT INTO bienes (codigo_bien, codigo, descripcion, serial, marca, modelo, fecha_adquisicion, factura, depreciacion, departamento, responsable, estado, valor, imagenes, fecha_incorporacion, estatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Activo', ?, ?, CURDATE(), 'Activo')`, 
            [
                codigo_institucional, 
                codigo_patrimonial || '14010-000', 
                descripcion, 
                serial || '', 
                marca || '', 
                modelo || '', 
                fechaAdqVal, 
                factura || '', 
                depreciacion || 'Línea Recta', 
                departamento || 'General', 
                responsable || 'General', 
                valor || 0.00, 
                imagenesJson
            ]
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
        const [rows] = await db.query(`SELECT b.*, MAX(e.motivo) as motivo_enajenacion FROM bienes b LEFT JOIN enajenaciones e ON b.id = e.bien_id WHERE b.estatus IN ('Desincorporado', 'Enajenado', 'DESINCORPORADO', 'ENAJENADO') OR b.estado IN ('Desincorporado', 'Enajenado', 'DESINCORPORADO', 'ENAJENADO') GROUP BY b.id ORDER BY b.codigo_bien ASC`); 
        res.json(rows); 
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.desincorporar = async (req, res) => {
    try { await db.query("UPDATE bienes SET estado = 'Desincorporado', estatus = 'Desincorporado', fecha_desincorporacion = CURDATE() WHERE id = ?", [req.params.id]); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};

exports.enajenarBien = async (req, res) => {
    try {
        const { id, motivo } = req.body;
        await db.query("UPDATE bienes SET estado = 'Enajenado', estatus = 'Enajenado', fecha_enajenacion = CURDATE() WHERE id = ?", [id]);
        const [existing] = await db.query("SELECT id FROM enajenaciones WHERE bien_id = ?", [id]);
        if (existing.length > 0) { await db.query("UPDATE enajenaciones SET motivo = ? WHERE bien_id = ?", [motivo, id]); } 
        else { await db.query("INSERT INTO enajenaciones (bien_id, motivo) VALUES (?, ?)", [id, motivo]); }
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