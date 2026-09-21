const db = require('../config/database');

exports.getCompras = async (req, res) => {
    try { const [rows] = await db.query("SELECT * FROM compras ORDER BY id DESC"); res.json(rows); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createCompra = async (req, res) => {
    try {
        const { descripcion, justificacion, presupuesto, link_referencia } = req.body;
        const foto = req.file ? req.file.filename : null;
        const solicitante = req.user ? req.user.nombre : 'Administrador';
        const departamento = req.user ? req.user.departamento : 'General';
        await db.query(`INSERT INTO compras (solicitante, departamento, descripcion, justificacion, presupuesto, link_referencia, foto_adjunta, estado, estatus) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente Supervisor', 'Pendiente Supervisor')`, [solicitante, departamento, descripcion || '', justificacion || '', parseFloat(presupuesto) || 0, link_referencia || null, foto]);
        res.json({ success: true, message: "Compra creada" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.aprobarSup = async (req, res) => {
    try { await db.query("UPDATE compras SET estado = 'Aprobado Supervisor', estatus = 'Aprobado Supervisor' WHERE id = ?", [req.params.id]); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};

exports.aprobarCompra = async (req, res) => {
    try {
        const factura = req.file ? req.file.filename : null;
        await db.query("UPDATE compras SET estado = 'Aprobado', estatus = 'Completado', factura_adjunta = ? WHERE id = ?", [factura, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.rechazarCompra = async (req, res) => {
    try { await db.query("UPDATE compras SET estado = 'Rechazado', estatus = 'Rechazado' WHERE id = ?", [req.params.id]); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getContabilidad = async (req, res) => {
    try { const [rows] = await db.query("SELECT * FROM compras WHERE estado = 'Aprobado' ORDER BY id DESC"); res.json(rows); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};