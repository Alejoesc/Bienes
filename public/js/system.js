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
        // Se fuerza la extensión .xls aquí también
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