const db = require('../config/database');
const ExcelJS = require('exceljs');
const fs = require('fs');

exports.exportBienes = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM bienes");
        
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'SGBN - Sistema de Gestión de Bienes';
        workbook.created = new Date();
        
        const worksheet = workbook.addWorksheet('Inventario de Bienes');
        worksheet.views = [{ showGridLines: true }];

        worksheet.columns = [
            { header: 'Código', key: 'codigo_bien', width: 18 },
            { header: 'Descripción', key: 'descripcion', width: 35 },
            { header: 'Serial', key: 'serial', width: 22 },
            { header: 'Departamento', key: 'departamento', width: 25 },
            { header: 'Estado', key: 'estado', width: 15 },
            { header: 'Valor ($)', key: 'valor', width: 15 },
            { header: 'Fecha Incorporación', key: 'fecha_incorporacion', width: 20 }
        ];

        const headerRow = worksheet.getRow(1);
        headerRow.font = { name: 'Inter', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '2563EB' }
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 28;

        rows.forEach((item) => {
            const rowData = {
                codigo_bien: item.codigo_bien || item.codigo || '',
                descripcion: item.descripcion || '',
                serial: item.serial || '',
                departamento: item.departamento || '',
                estado: item.estado || 'Activo',
                valor: Number(item.valor) || 0,
                fecha_incorporacion: item.fecha_incorporacion ? item.fecha_incorporacion.toString().split('T')[0] : ''
            };

            const row = worksheet.addRow(rowData);
            row.height = 20;
            row.font = { name: 'Inter', size: 10 };
            
            row.getCell('codigo_bien').alignment = { vertical: 'middle', horizontal: 'center' };
            row.getCell('descripcion').alignment = { vertical: 'middle', horizontal: 'left' };
            row.getCell('serial').alignment = { vertical: 'middle', horizontal: 'center' };
            row.getCell('departamento').alignment = { vertical: 'middle', horizontal: 'left' };
            row.getCell('estado').alignment = { vertical: 'middle', horizontal: 'center' };
            
            const valorCell = row.getCell('valor');
            valorCell.numFmt = '"$"#,##0.00';
            valorCell.alignment = { vertical: 'middle', horizontal: 'right' };

            row.getCell('fecha_incorporacion').alignment = { vertical: 'middle', horizontal: 'center' };

            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'E2E8F0' } },
                    left: { style: 'thin', color: { argb: 'E2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
                    right: { style: 'thin', color: { argb: 'E2E8F0' } }
                };
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=inventario_bienes_${new Date().toISOString().split('T')[0]}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

exports.createBackup = async (req, res) => {
    try {
        const tablas = ['departamentos', 'usuarios', 'bienes', 'compras', 'licencias', 'auditoria', 'enajenaciones', 'traspasos'];
        let sqlDump = `-- SGBN - Respaldo Oficial de Base de Datos\n-- Fecha: ${new Date().toISOString()}\n\n`;
        sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

        for (const tabla of tablas) {
            try {
                const [rows] = await db.query(`SELECT * FROM ${tabla}`);
                if (rows.length > 0) {
                    sqlDump += `-- Datos de la tabla: ${tabla}\n`;
                    sqlDump += `TRUNCATE TABLE ${tabla};\n`;
                    for (const row of rows) {
                        const keys = Object.keys(row);
                        const values = Object.values(row).map(val => {
                            if (val === null) return 'NULL';
                            if (typeof val === 'object') return `'${JSON.stringify(val)}'`;
                            return `'${String(val).replace(/'/g, "''")}'`;
                        });
                        sqlDump += `INSERT INTO ${tabla} (${keys.join(', ')}) VALUES (${values.join(', ')});\n`;
                    }
                    sqlDump += `\n`;
                }
            } catch (err) {
                // Omitir si la tabla no existe
            }
        }
        sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;

        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename=sgbn_backup_${new Date().toISOString().split('T')[0]}.sql`);
        res.send(sqlDump);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.restoreBackup = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No se proporcionó archivo de respaldo SQL." });

        const sqlContent = fs.readFileSync(req.file.path, 'utf8');
        
        // Deshabilitar restricciones de claves foráneas temporalmente
        await db.query("SET FOREIGN_KEY_CHECKS = 0;");

        const lines = sqlContent.split('\n');
        let currentQuery = '';

        for (let line of lines) {
            const trimmed = line.trim();
            // Ignorar líneas vacías, comentarios o texto corrupto que no sea SQL válido
            if (trimmed.startsWith('--') || trimmed === '' || trimmed.startsWith('{')) continue;
            
            currentQuery += ' ' + trimmed;
            if (trimmed.endsWith(';')) {
                const queryToRun = currentQuery.trim();
                // Validar que la consulta empiece con comandos SQL permitidos
                if (queryToRun.length > 0 && (queryToRun.toUpperCase().startsWith('INSERT') || queryToRun.toUpperCase().startsWith('TRUNCATE') || queryToRun.toUpperCase().startsWith('SET'))) {
                    try {
                        await db.query(queryToRun);
                    } catch (qErr) {
                        console.error("Error en consulta SQL de restauración:", qErr.message);
                    }
                }
                currentQuery = '';
            }
        }

        // Rehabilitar claves foráneas
        await db.query("SET FOREIGN_KEY_CHECKS = 1;");

        fs.unlinkSync(req.file.path);
        res.json({ success: true, message: "Base de datos restaurada correctamente." });
    } catch (err) {
        try { await db.query("SET FOREIGN_KEY_CHECKS = 1;"); } catch(e){}
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: "Error al restaurar base de datos: " + err.message });
    }
};

exports.getAuditoria = async (req, res) => {
    try { const [rows] = await db.query("SELECT * FROM auditoria ORDER BY id DESC"); res.json(rows); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getDepartamentos = async (req, res) => {
    try { 
        const [rows] = await db.query("SELECT * FROM departamentos ORDER BY id ASC");
        
        // Enviamos tanto un arreglo plano como un objeto 'data' por compatibilidad con el frontend
        res.json(rows);
    } 
    catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

exports.createDepartamento = async (req, res) => {
    try { await db.query("INSERT INTO departamentos (nombre) VALUES (?)", [req.body.nombre]); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteDepartamento = async (req, res) => {
    try { await db.query("DELETE FROM departamentos WHERE id = ?", [req.params.id]); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
};