async function descargarExportExcel() {
    try {
        const res = await fetch('/api/export/bienes', { 
            headers: authHeaders() 
        });
        
        if (!res.ok) {
            const errData = await res.json();
            return mostrarNotificacion(errData.error || "Error al exportar inventario.", "error");
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventario_bienes_${new Date().toISOString().split('T')[0]}.xls`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        mostrarNotificacion("Inventario exportado exitosamente.", "success");
    } catch(e) {
        mostrarNotificacion("Error de conexión al exportar inventario.", "error");
    }
}

async function descargarBackupSQL() {
    try {
        const res = await fetch('/api/backup', {
            headers: authHeaders()
        });

        if (!res.ok) {
            return mostrarNotificacion("Error al generar el respaldo de la base de datos.", "error");
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sgbn_backup_${new Date().toISOString().split('T')[0]}.sql`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        mostrarNotificacion("Respaldo SQL descargado con éxito.", "success");
    } catch (e) {
        mostrarNotificacion("Error de conexión al generar el respaldo SQL.", "error");
    }
}

function actualizarNombreArchivo(input) {
    const display = document.getElementById('file-name-display');
    if (input.files && input.files.length > 0) {
        display.innerText = "Archivo seleccionado: " + input.files[0].name;
    } else {
        display.innerText = "Haga clic para seleccionar archivo Excel (.xlsx)";
    }
}

function actualizarNombreSQL(input) {
    const display = document.getElementById('sql-name-display');
    if (input.files && input.files.length > 0) {
        display.innerText = "Archivo SQL: " + input.files[0].name;
    } else {
        display.innerText = "Seleccionar archivo de respaldo (.sql)";
    }
}

async function importarExcel() {
    const input = document.getElementById('file-import');
    if (!input.files || input.files.length === 0) {
        return mostrarNotificacion("Seleccione un archivo Excel primero.", "warning");
    }

    const formData = new FormData();
    formData.append('file', input.files[0]);

    try {
        const res = await fetch('/api/import/bienes', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });

        if (res.ok) {
            mostrarNotificacion("Inventario importado correctamente.", "success");
            input.value = '';
            document.getElementById('file-name-display').innerText = "Haga clic para seleccionar archivo Excel (.xlsx)";
        } else {
            const err = await res.json();
            mostrarNotificacion(err.error || "Error al importar.", "error");
        }
    } catch (e) {
        mostrarNotificacion("Error de conexión al importar.", "error");
    }
}

async function restarurarBackupSQL() {
    const input = document.getElementById('file-restore-sql');
    if (!input.files || input.files.length === 0) {
        return mostrarNotificacion("Seleccione un archivo de respaldo SQL.", "warning");
    }

    const formData = new FormData();
    formData.append('file', input.files[0]);

    try {
        const res = await fetch('/api/restore', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });

        if (res.ok) {
            mostrarNotificacion("Base de datos restaurada con éxito.", "success");
            input.value = '';
            document.getElementById('sql-name-display').innerText = "Seleccionar archivo de respaldo (.sql)";
        } else {
            const err = await res.json();
            mostrarNotificacion(err.error || "Error al restaurar base de datos.", "error");
        }
    } catch (e) {
        mostrarNotificacion("Error de conexión al restaurar.", "error");
    }
}