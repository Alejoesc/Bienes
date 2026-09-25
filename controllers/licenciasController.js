const db = require('../config/database');

exports.getAll = async (req, res) => {
    try { const [rows] = await db.query("SELECT * FROM licencias ORDER BY id DESC"); res.json(rows); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
    try {
        const { software, serial, tipo, fecha_vencimiento, departamento } = req.body;
        await db.query("INSERT INTO licencias (software, serial, tipo, fecha_vencimiento, departamento, estatus) VALUES (?, ?, ?, ?, ?, 'Activa')", [software, serial, tipo, fecha_vencimiento, departamento]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.retirarLicencia = async (req, res) => {
    try { 
        const motivo = req.body.motivo || 'Retirada del sistema';
        await db.query("UPDATE licencias SET estatus = 'Retirada', departamento = ? WHERE id = ?", [motivo, req.params.id]); 
        res.json({ success: true }); 
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.renovarLicencia = async (req, res) => {
    try { await db.query("UPDATE licencias SET fecha_vencimiento = ?, estatus = 'Renovada' WHERE id = ?", [req.body.nueva_fecha, req.params.id]); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};

exports.delete = async (req, res) => {
    try { await db.query("DELETE FROM licencias WHERE id = ?", [req.params.id]); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};