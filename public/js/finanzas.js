let cacheContabilidadGlobal = [];
let datosContabilidadFiltradosActuales = [];

window.cargarDatosContabilidadCustom = async function() {
    try {
        const res = await fetch('/api/contabilidad', { headers: authHeaders() });
        if(res.ok) {
            cacheContabilidadGlobal = await res.json();
            datosContabilidadFiltradosActuales = cacheContabilidadGlobal;
            renderizarTablaContabilidad(cacheContabilidadGlobal);
        }
    } catch(e) {
        console.error("Error al cargar contabilidad", e);
    }
};

window.renderizarTablaContabilidad = function(datos) {
    datosContabilidadFiltradosActuales = datos; // Guardamos los filtrados actuales para la exportación
    const tbody = document.getElementById('tabla-contabilidad');
    if(!tbody) return;

    tbody.innerHTML = datos.map(c => `
        <tr>
            <td><strong>#${c.id}</strong></td>
            <td>${c.descripcion || '-'}</td>
            <td><strong>$ ${parseFloat(c.presupuesto || c.monto || 0).toFixed(2)}</strong></td>
            <td><span class="badge" style="background:var(--success); color:#fff; padding: 3px 8px; border-radius: 4px; font-size: 11px;">${c.estado || c.estatus || 'Completado'}</span></td>
        </tr>
    `).join('') || `<tr><td colspan="4" style="text-align:center;">No hay registros contables disponibles.</td></tr>`;
};

window.filtrarContabilidad = function() {
    const texto = (document.getElementById('filtro-texto')?.value || '').toLowerCase();
    const desde = document.getElementById('filtro-desde')?.value || '';
    const hasta = document.getElementById('filtro-hasta')?.value || '';

    const filtrados = cacheContabilidadGlobal.filter(c => {
        const desc = (c.descripcion || '').toLowerCase();
        const idStr = String(c.id || '').toLowerCase();
        const coincideTexto = desc.includes(texto) || idStr.includes(texto);

        const fechaRegistro = c.created_at ? c.created_at.split('T')[0] : '';
        let coincideFecha = true;
        if(desde && fechaRegistro && fechaRegistro < desde) coincideFecha = false;
        if(hasta && fechaRegistro && fechaRegistro > hasta) coincideFecha = false;

        return coincideTexto && coincideFecha;
    });

    renderizarTablaContabilidad(filtrados);
};

window.exportarExcelContabilidad = function() {
    const datosAExportar = datosContabilidadFiltradosActuales.length > 0 ? datosContabilidadFiltradosActuales : cacheContabilidadGlobal;
    if(datosAExportar.length === 0) return mostrarNotificacion("No hay datos para exportar.", "warning");
    
    let csv = 'ID Compra,Descripcion,Monto Ejecutado ($),Estatus\n';
    datosAExportar.forEach(c => {
        csv += `"${c.id}","${(c.descripcion || '').replace(/"/g, '""')}","${c.presupuesto || c.monto || 0}","${c.estado || c.estatus || 'Completado'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_Contable_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    mostrarNotificacion("Reporte Excel (CSV) generado con éxito.", "success");
};

window.exportarPDFContabilidad = async function() {
    const datosAExportar = datosContabilidadFiltradosActuales.length > 0 ? datosContabilidadFiltradosActuales : cacheContabilidadGlobal;
    if(datosAExportar.length === 0) return mostrarNotificacion("No hay datos para exportar en PDF.", "warning");

    const desde = document.getElementById('filtro-desde')?.value || 'Inicio';
    const hasta = document.getElementById('filtro-hasta')?.value || 'Actual';

    const win = window.open('', '_blank');
    const filas = datosAExportar.map(c => `
        <tr>
            <td>#${c.id}</td>
            <td>${c.descripcion || '-'}</td>
            <td>$ ${parseFloat(c.presupuesto || c.monto || 0).toFixed(2)}</td>
            <td>${c.estado || c.estatus || 'Completado'}</td>
        </tr>
    `).join('');

    win.document.write(`
        <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte Contable Oficial</title>
        <style>
            body { font-family: sans-serif; margin: 30px; color: #111; font-size: 12px; }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f1f5f9; text-transform: uppercase; font-size: 11px; }
            @media print { button { display: none; } }
        </style></head><body>
            <div class="header">
                <h2>REPÚBLICA BOLIVARIANA DE VENEZUELA</h2>
                <h4>SISTEMA DE GESTIÓN DE BIENES NACIONALES - REGISTRO CONTABLE</h4>
            </div>
            <p><b>Período consultado:</b> ${desde} al ${hasta} | <b>Total Registros:</b> ${datosAExportar.length}</p>
            <table>
                <thead>
                    <tr><th>ID Compra</th><th>Descripción</th><th>Monto Ejecutado ($)</th><th>Estatus</th></tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
            <script>window.onload = function() { window.print(); };<\/script>
        </body></html>
    `);
    win.document.close();
    mostrarNotificacion("Reporte PDF generado con éxito.", "success");
};