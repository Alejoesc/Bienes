const db = require('../config/database');

async function notificarTelegram(compra) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '8836591241:AAHNdk5xxGtsiUcg0yAkKoYGG6pho9o0HOk';
    const chatId = process.env.TELEGRAM_CHAT_ID || '1497722264';
    if (!botToken || !chatId) return; 
    
    const textoMensaje = `🛒 <b>NUEVA REQUISICIÓN CREADA</b>\n\n` +
                         `<b>Solicitante:</b> ${compra.solicitante}\n` +
                         `<b>Departamento:</b> ${compra.departamento}\n` +
                         `<b>Descripción:</b> ${compra.descripcion}\n` +
                         `<b>Presupuesto:</b> $${compra.presupuesto}\n\n` +
                         `📌 <i>Requiere revisión en el panel SGBN.</i>`;
    try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: textoMensaje, parse_mode: 'HTML' })
        });
    } catch(err) { console.error("Fallo Telegram:", err.message); }
}

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
        notificarTelegram({ solicitante, departamento, descripcion: descripcion || 'Sin descripción', presupuesto: parseFloat(presupuesto) || 0 });
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
    try { 
        const motivo = req.body.motivo || 'Rechazo Institucional';
        await db.query("UPDATE compras SET estado = 'Rechazado', estatus = ? WHERE id = ?", [`Motivo: ${motivo}`, req.params.id]); 
        res.json({ success: true }); 
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getContabilidad = async (req, res) => {
    try { const [rows] = await db.query("SELECT * FROM compras WHERE estado = 'Aprobado' ORDER BY id DESC"); res.json(rows); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};