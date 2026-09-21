const db = require('../config/database');

exports.getAll = async (req, res) => {
    try { 
        const [rows] = await db.query("SELECT id, cedula, nombre, correo, departamento, username, role, permisos FROM usuarios"); 
        res.json(rows); 
    } 
    catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
    try {
        const { cedula, nombre, correo, departamento, username, password, role, permisos } = req.body;
        const permisosStr = typeof permisos === 'object' ? JSON.stringify(permisos) : (permisos || '[]');
        
        await db.query(
            "INSERT INTO usuarios (cedula, nombre, correo, departamento, username, password, role, permisos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
            [cedula, nombre, correo, departamento, username, password, role || 'viewer', permisosStr]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.update = async (req, res) => {
    try {
        const { cedula, nombre, correo, departamento, username, password, role, permisos } = req.body;
        const permisosStr = typeof permisos === 'object' ? JSON.stringify(permisos) : (permisos || '[]');

        if (password) { 
            await db.query(
                "UPDATE usuarios SET cedula=?, nombre=?, correo=?, departamento=?, username=?, password=?, role=?, permisos=? WHERE id=?", 
                [cedula, nombre, correo, departamento, username, password, role, permisosStr, req.params.id]
            ); 
        } else { 
            await db.query(
                "UPDATE usuarios SET cedula=?, nombre=?, correo=?, departamento=?, username=?, role=?, permisos=? WHERE id=?", 
                [cedula, nombre, correo, departamento, username, role, permisosStr, req.params.id]
            ); 
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};