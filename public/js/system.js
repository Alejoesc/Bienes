window.loadDepartamentosList = async function() {
    try {
        const res = await fetch('/api/departamentos', { headers: authHeaders() });
        const dptos = await res.json();
        const tbody = document.getElementById('tabla-dptos');
        if(!tbody) return;
        tbody.innerHTML = dptos.map(d => `<tr><td>${d.id}</td><td><strong>${d.nombre}</strong></td><td>${role === 'admin' ? `<button onclick="deleteDepartamento(${d.id})" class="btn-danger" style="padding:4px 8px; font-size:11px;">Eliminar</button>` : ''}</td></tr>`).join('');
    } catch(e) {}
};

window.addDepartamento = async function() {
    const nombre = document.getElementById('d-nombre').value.trim();
    if(!nombre) return mostrarNotificacion("Ingrese el nombre.", "warning");
    const res = await fetch('/api/departamentos', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ nombre }) });
    if(res.ok) { mostrarNotificacion("Departamento añadido", "success"); document.getElementById('d-nombre').value = ''; loadDepartamentosList(); }
};

window.deleteDepartamento = async function(id) {
    mostrarModalAlerta("¿Eliminar departamento?", async () => {
        await fetch(`/api/departamentos/${id}`, { method: 'DELETE', headers: authHeaders() });
        loadDepartamentosList();
    });
};

window.loadAuditoria = async function() {
    try {
        const res = await fetch('/api/auditoria', { headers: authHeaders() });
        const audits = await res.json();
        const tbody = document.getElementById('tabla-auditoria');
        if(!tbody) return;
        tbody.innerHTML = audits.map(a => `<tr><td>${a.created_at || a.fecha}</td><td><strong>${a.usuario}</strong></td><td><code>${a.ip}</code></td><td><span class="badge badge-primary">${a.accion}</span></td><td>${a.detalle}</td></tr>`).join('');
    } catch(e) {}
};

window.exportarExcel = () => window.location.href = '/api/export/bienes';
window.descargarBackupSQL = () => window.location.href = '/api/backup';

window.importarExcel = async function() {
    const input = document.getElementById('file-import');
    if(!input.files[0]) return mostrarNotificacion("Seleccione un archivo Excel.", "warning");
    const formData = new FormData();
    formData.append('file', input.files[0]);
    const res = await fetch('/api/import/bienes', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
    if(res.ok) { mostrarNotificacion("Datos importados con éxito.", "success"); }
    else { mostrarNotificacion("Error al importar.", "error"); }
};