const db = require('../config/database');

async function registrarAuditoria(req, accion, detalle) {
    try {
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        if (ip && ip.includes('ffff:')) ip = ip.split('ffff:')[1];
        else if (ip === '::1' || ip === '1' || !ip) ip = '127.0.0.1';

        const username = req.user ? (req.user.username || req.user.nombre || 'Sistema') : 'Sistema';
        
        const ua = req.headers['user-agent'] || '';
        let dispositivo = 'Windows PC';
        if (ua.includes('Mac')) dispositivo = 'MacOS PC';
        else if (ua.includes('Linux')) dispositivo = 'Linux Workstation';
        else if (ua.includes('Android')) dispositivo = 'Android Mobile';
        else if (ua.includes('iPhone') || ua.includes('iPad')) dispositivo = 'iOS Device';

        await db.query(
            "INSERT INTO auditoria (usuario, accion, detalle, ip, mac) VALUES (?, ?, ?, ?, ?)",
            [username, accion, detalle, ip, dispositivo]
        );
    } catch (err) {
        console.error("Error al registrar auditoría en la base de datos:", err);
    }
}

module.exports = { registrarAuditoria };