const jwt = require('jsonwebtoken');
const { registrarAuditoria } = require('../utils/audit');
const JWT_SECRET = 'sgbn_secret_key_2026';

const auth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token de acceso requerido' });

    jwt.verify(token, JWT_SECRET, async (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
        req.user = user;

        if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
            if (!req.path.includes('/auditoria/log')) {
                let accion = 'ACCION_SISTEMA';
                let detalle = `Operación ${req.method} en ${req.path}`;
                if (req.path.includes('/bienes')) accion = 'GESTION_INVENTARIO';
                else if (req.path.includes('/compras')) accion = 'GESTION_COMPRAS';
                else if (req.path.includes('/licencias')) accion = 'GESTION_LICENCIAS';
                else if (req.path.includes('/usuarios')) accion = 'GESTION_USUARIOS';
                else if (req.path.includes('/enajenar') || req.path.includes('/desincorporar')) accion = 'ENAJENACION_O_BAJA';
                else if (req.path.includes('/traspasar')) accion = 'TRASPASO';
                await registrarAuditoria(req, accion, detalle);
            }
        }
        next();
    });
};

const checkRole = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.user || !rolesPermitidos.includes(req.user.role)) return res.status(403).json({ error: 'Acceso denegado: Privilegios insuficientes' });
        next();
    };
};

module.exports = { auth, checkRole };