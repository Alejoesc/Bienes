window.loadTransfers = async function() {
    try {
        const res = await fetch('/api/notificaciones', { headers: authHeaders() });
        const list = await res.json();
        const tbody = document.getElementById('tabla-traspasos');
        if(tbody) {
            tbody.innerHTML = list.map(t => `
                <tr>
                    <td><strong>${t.codigo_bien || 'N/D'}</strong><br><small style="color: var(--text-muted);">${t.descripcion || 'Sin descripción'}</small></td>
                    <td><span style="color: var(--danger); font-weight: 600;">${t.depto_origen}</span> <span class="material-icons" style="font-size: 14px; vertical-align: middle;">arrow_forward</span> <span style="color: var(--success); font-weight: 600;">${t.depto_destino}</span></td>
                    <td>${t.solicitante || 'Sistema'}</td>
                    <td>
                        <div style="display:flex; gap:5px;">
                            <button onclick="resolverTraspaso(${t.id}, 'aprobar')" class="btn-primary" style="background-color: var(--success); padding: 6px 12px; font-size: 12px;">Aprobar</button>
                            <button onclick="resolverTraspaso(${t.id}, 'rechazar')" class="btn-danger" style="padding: 6px 12px; font-size: 12px;">Rechazar</button>
                        </div>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="4" style="text-align:center; padding: 20px; color: var(--text-muted);">No hay solicitudes pendientes.</td></tr>';
        }
    } catch(e) {}
};

window.resolverTraspaso = async function(id, accion) {
    mostrarModalAlerta(`¿Está seguro de ${accion} este traspaso?`, async () => {
        try {
            const res = await fetch(`/api/traspasos/${id}/${accion}`, { method: 'PUT', headers: authHeaders() });
            const data = await res.json();
            if(data.success) {
                mostrarNotificacion(`Traspaso ${accion} con éxito.`, "success");
                loadTransfers();
                if(typeof loadBienes === 'function') loadBienes();
            }
        } catch(e) {}
    });
};

document.addEventListener("DOMContentLoaded", () => {
    if(localStorage.getItem('role') === 'admin') loadTransfers();
});