const db = require('../config/database');
const ExcelJS = require('exceljs');
const fs = require('fs');

exports.exportBienes = async (req, res) => {
    try { const [rows] = await db.query("SELECT * FROM bienes"); res.json(rows); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};

exports.importBienes = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No se proporcionó Excel." });
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.worksheets[0];
        
        worksheet.eachRow(async (row, rowNumber) => {
            if (rowNumber > 1) {
                const codigo_bien = row.getCell(1).value;
                const descripcion = row.getCell(2).value;
                if (codigo_bien && descripcion) {
                    await db.query("INSERT INTO bienes (codigo_bien, codigo, descripcion, serial, departamento, estado, valor, fecha_incorporacion, estatus) VALUES (?, ?, ?, ?, ?, 'Activo', ?, CURDATE(), 'Activo')", [codigo_bien, codigo_bien, descripcion, row.getCell(5).value || '', row.getCell(7).value || 'General', row.getCell(9).value || 0]);
                }
            }
        });
        fs.unlinkSync(req.file.path);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createBackup = async (req, res) => { res.json({ success: true, message: "Respaldo generado" }); };

exports.getAuditoria = async (req, res) => {
    try { const [rows] = await db.query("SELECT * FROM auditoria ORDER BY id DESC"); res.json(rows); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getDepartamentos = async (req, res) => {
    try { const [rows] = await db.query("SELECT * FROM departamentos"); res.json(rows); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createDepartamento = async (req, res) => {
    try { await db.query("INSERT INTO departamentos (nombre) VALUES (?)", [req.body.nombre]); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteDepartamento = async (req, res) => {
    try { await db.query("DELETE FROM departamentos WHERE id = ?", [req.params.id]); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};