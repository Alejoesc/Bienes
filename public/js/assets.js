let inventarioGlobal = [];

window.loadBienes = async function() {
    try {
        const res = await fetch('/api/bienes', { headers: authHeaders() });
        const bienes = await res.json();
        inventarioGlobal = bienes.filter(b => { const est = (b.estatus || b.estado || '').toLowerCase(); return est === 'activo' || est === ''; });
        renderTablaBienes(inventarioGlobal);
        cargarDepartamentosSelect();
    } catch (err) { console.error(err); }
};

window.renderTablaBienes = function(datos) {
    const tbody = document.getElementById('tabla-bienes');
    if(!tbody) return;
    tbody.innerHTML = datos.length === 0 ? `<tr><td colspan="5" style="text-align:center;">No hay registros.</td></tr>` : datos.map(b => `
        <tr>
            <td><strong>${b.codigo_bien || b.codigo || 'N/D'}</strong></td>
            <td><strong>${b.descripcion || '-'}</strong><br><small>Serial: ${b.serial || 'S/N'}</small></td>
            <td>${b.departamento || 'No asignado'}</td>
            <td><span class="badge badge-success">${b.estado || 'Activo'}</span></td>
            <td>${role === 'admin' ? `
                <button onclick="abrirTraspasoModal(${b.id})" class="btn-primary" style="padding:6px 10px; font-size:11px;">Traspaso</button>
                <button onclick="desincorporarBien(${b.id})" class="btn-danger" style="padding:6px 10px; font-size:11px;">Desincorporar</button>
                <button onclick="abrirEnajenacionModal(${b.id})" class="btn-warning" style="padding:6px 10px; font-size:11px;">Enajenar</button>
            ` : `<span class="badge" style="background:#555">Solo Lectura</span>`}</td>
        </tr>
    `).join('');
};

window.filterBienes = function() {
    const q = (document.getElementById('search-input').value || '').toLowerCase();
    renderTablaBienes(inventarioGlobal.filter(b => (b.codigo_bien||'').toLowerCase().includes(q) || (b.descripcion||'').toLowerCase().includes(q) || (b.serial||'').toLowerCase().includes(q)));
};

async function cargarDepartamentosSelect() {
    try {
        const res = await fetch('/api/departamentos', { headers: authHeaders() });
        const dptos = await res.json();
        document.querySelectorAll('.select-dptos').forEach(s => s.innerHTML = '<option value="">Depto...</option>' + dptos.map(d => `<option value="${d.nombre}">${d.nombre}</option>`).join(''));
    } catch(e){}
}

window.addBien = async function() {
    const codigo_bien = document.getElementById('b-codigo').value;
    const descripcion = document.getElementById('b-desc').value;
    const serial = document.getElementById('b-serial').value;
    const departamento = document.getElementById('b-dpto').value;
    const valor = document.getElementById('b-valor').value;

    if(!codigo_bien || !descripcion) return mostrarNotificacion('Complete código y descripción.', 'warning');
    const res = await fetch('/api/bienes', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ codigo_bien, descripcion, serial, departamento, valor }) });
    if(res.ok) { mostrarNotificacion('Bien registrado', 'success'); setTimeout(() => location.reload(), 1000); }
};

window.desincorporarBien = function(id) {
    const modalConfirm = document.getElementById('modal-desincorporar-confirm');
    if(modalConfirm) {
        document.getElementById('desincorporar-bien-id').value = id;
        modalConfirm.classList.remove('hidden');
    }
};

window.cerrarModalDesincorporacion = function() {
    const modalConfirm = document.getElementById('modal-desincorporar-confirm');
    if(modalConfirm) modalConfirm.classList.add('hidden');
};

// Se procesa la desincorporación sin redireccionar, actualizando la lista en el sitio
window.confirmarDesincorporacionModal = async function() {
    const id = document.getElementById('desincorporar-bien-id').value;
    try {
        const res = await fetch(`/api/desincorporar/${id}`, { method: 'POST', headers: authHeaders() });
        if(res.ok) {
            cerrarModalDesincorporacion();
            mostrarNotificacion('Bien desincorporado y enviado a pendientes con éxito.', 'success');
            loadBienes(); // Recarga la tabla de activos sin salir de la página
        } else {
            mostrarNotificacion('Error al desincorporar el bien.', 'error');
        }
    } catch(e) {
        mostrarNotificacion('Error de conexión.', 'error');
    }
};

window.abrirTraspasoModal = (id) => { document.getElementById('traspaso-bien-id').value = id; document.getElementById('modal-traspaso').classList.remove('hidden'); };
window.cerrarTraspasoModal = () => document.getElementById('modal-traspaso').classList.add('hidden');
window.ejecutarTraspasoDirecto = async function() {
    const id = document.getElementById('traspaso-bien-id').value;
    const departamento_destino = document.getElementById('traspaso-dpto-destino').value;
    if(!departamento_destino) return mostrarNotificacion('Seleccione el departamento de destino.', 'warning');
    try {
        const res = await fetch('/api/traspasar', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ id, departamento_destino }) });
        if(res.ok) {
            mostrarNotificacion('Traspaso realizado con éxito.', 'success');
            cerrarTraspasoModal();
            loadBienes();
        } else { mostrarNotificacion('Error al procesar el traspaso.', 'error'); }
    } catch(e) { mostrarNotificacion('Error de conexión.', 'error'); }
};

window.abrirEnajenacionModal = (id) => { document.getElementById('enajenacion-bien-id').value = id; document.getElementById('enajenacion-motivo').value = ''; document.getElementById('modal-enajenacion').classList.remove('hidden'); };
window.cerrarEnajenacionModal = () => document.getElementById('modal-enajenacion').classList.add('hidden');

// Se procesa la enajenación sin redireccionar, manteniendo al operador en el inventario
window.ejecutarEnajenacionDirecta = async function() {
    const id = document.getElementById('enajenacion-bien-id').value;
    const motivo = document.getElementById('enajenacion-motivo').value.trim();
    if(!motivo) return mostrarNotificacion('Ingrese el motivo de la enajenación.', 'warning');
    try {
        const res = await fetch('/api/enajenar', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ id, motivo }) });
        if(res.ok) {
            mostrarNotificacion('Bien enajenado con éxito.', 'success');
            cerrarEnajenacionModal();
            loadBienes(); // Recarga la tabla de activos sin salir de la página
        } else { mostrarNotificacion('Error al procesar la enajenación.', 'error'); }
    } catch(e) { mostrarNotificacion('Error de conexión.', 'error'); }
};

function actualizarSudebip() {
    const val = document.getElementById('b-sudebip').value;
    if(val) {
        const parts = val.split(' | ');
        document.getElementById('b-grupo').value = parts[0] || '';
        document.getElementById('b-subgrupo').value = parts[1] || '';
    } else {
        document.getElementById('b-grupo').value = '';
        document.getElementById('b-subgrupo').value = '';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if(typeof loadBienes === 'function') loadBienes();
    const selectSudebip = document.getElementById('b-sudebip');
    if(selectSudebip) selectSudebip.addEventListener('change', actualizarSudebip);
});