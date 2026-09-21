const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { registrarAuditoria } = require('../utils/audit');
const JWT_SECRET = 'sgbn_secret_key_2026';

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await db.query("SELECT * FROM usuarios WHERE username = ?", [username]);
        if (rows.length === 0) return res.status(401).json({ error: "Credenciales incorrectas" });

        const user = rows[0];
        let passwordValid = false;
        if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
            passwordValid = await bcrypt.compare(password, user.password);
        } else { passwordValid = (password === user.password); }

        if (!passwordValid) return res.status(401).json({ error: "Credenciales incorrectas" });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role, nombre: user.nombre, departamento: user.departamento }, JWT_SECRET, { expiresIn: '8h' });
        await registrarAuditoria(req, 'INICIO_SESION', `Usuario ${user.username} inició sesión`);
        res.json({ success: true, token, role: user.role, nombre: user.nombre || user.username });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.logout = async (req, res) => {
    try { await registrarAuditoria(req, 'CIERRE_SESION', `El usuario cerró sesión`); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};