let cacheLicencias = [];

window.loadLicenciasGrid = async function() {
    try {
        const res = await fetch('/api/licencias', { headers: authHeaders() });
        const data = await res.json();
        cacheLicencias = data;
        
        const tbodyActivas = document.getElementById('tabla-licencias-activas');
        const tbodyHistorial = document.getElementById('tabla-licencias-historial');
        if(!tbodyActivas) return;

        const hoy = new Date();
        const activas = [];
        const historial = [];

        data.forEach(l => {
            if (l.estatus === 'Retirada' || l.estatus === 'Vencida/Retirada') {
                historial.push(l);
            } else {
                if (l.fecha_vencimiento) {
                    const fechaVenc = new Date(l.fecha_vencimiento);
                    const diferenciaDias = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));
                    l.diasRestantes = diferenciaDias;

                    if (diferenciaDias <= 30 && diferenciaDias >= 0) {
                        if (diferenciaDias === 0) {
                            mostrarNotificacion(`⚠️ La licencia de "${l.software}" vence HOY.`, "warning");
                        } else {
                            mostrarNotificacion(`⏳ Faltan ${diferenciaDias} días para el vencimiento de "${l.software}".`, "warning");
                        }
                    } else if (diferenciaDias < 0) {
                        mostrarNotificacion(`❌ La licencia de "${l.software}" ha VENCIDO hace ${Math.abs(diferenciaDias)} días.`, "error");
                    }
                }
                activas.push(l);
            }
        });

        tbodyActivas.innerHTML = activas.map(l => {
            let badgeColor = 'var(--success)';
            let textoVenc = l.fecha_vencimiento ? l.fecha_vencimiento.split('T')[0] : 'Indefinida';
            
            if (l.diasRestantes !== undefined) {
                if (l.diasRestantes < 0) {
                    badgeColor = 'var(--danger)';
                    textoVenc += ` <br><b style="color:var(--danger);">Vencida hace ${Math.abs(l.diasRestantes)} días</b>`;
                } else if (l.diasRestantes <= 30) {
                    badgeColor = 'var(--warning)';
                    textoVenc += ` <br><b style="color:var(--warning);">Faltan ${l.diasRestantes} días</b>`;
                }
            }

            return `
                <tr class="licencia-item" onclick="verDetalleLicencia(${l.id})" style="cursor:pointer;" title="Haz clic para ver el expediente">
                    <td><strong>${l.software}</strong><br><small style="color:var(--text-muted);">${l.serial || l.clave || 'Sin Clave'}</small></td>
                    <td>${textoVenc}</td>
                    <td>${l.departamento || l.responsable || '-'}<br><small>${l.equipo || '-'}</small></td>
                    <td><span class="badge" style="background:${badgeColor}; color:#fff;">${l.estatus || 'Activa'}</span></td>
                    <td onclick="event.stopPropagation()">
                        <button onclick="abrirModalRenovar(${l.id})" class="btn-primary" style="padding:4px 8px; font-size:11px; margin-right:4px;">Extender</button>
                        <button onclick="marcarRetirada(${l.id})" class="btn-danger" style="padding:4px 8px; font-size:11px;">Retirar</button>
                    </td>
                </tr>
            `;
        }).join('') || `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No hay licencias activas registradas.</td></tr>`;

        if(tbodyHistorial) {
            tbodyHistorial.innerHTML = historial.map(l => `
                <tr>
                    <td><strong>${l.software}</strong><br><small style="color:var(--text-muted);">${l.serial || l.clave || 'Sin Clave'}</small></td>
                    <td>${l.fecha_vencimiento ? l.fecha_vencimiento.split('T')[0] : '-'}</td>
                    <td>Retirada del sistema</td>
                    <td><span class="badge badge-danger">${l.estatus}</span></td>
                    <td><button onclick="abrirModalRenovar(${l.id})" class="btn-primary" style="padding:4px 8px; font-size:11px; background:var(--success);">Reanudar</button></td>
                </tr>
            `).join('') || `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">El historial está vacío.</td></tr>`;
        }
    } catch(e) {}
};

window.loadLicencias = window.loadLicenciasGrid;

window.registrarLicencia = async function() {
    const software = document.getElementById('l-software').value.trim();
    const serial = document.getElementById('l-clave').value.trim();
    const fecha_vencimiento = document.getElementById('l-vence').value;
    const departamento = document.getElementById('l-responsable').value.trim();

    if(!software || !serial) return mostrarNotificacion("Software y Clave obligatorios.", "warning");

    try {
        const res = await fetch('/api/licencias', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ software, serial, fecha_vencimiento, departamento }) });
        if(res.ok) {
            mostrarNotificacion("Licencia registrada", "success");
            document.getElementById('l-software').value = '';
            document.getElementById('l-clave').value = '';
            document.getElementById('l-vence').value = '';
            document.getElementById('l-responsable').value = '';
            loadLicenciasGrid();
        }
    } catch(e) {}
};

window.marcarRetirada = function(id) {
    const modalRetirar = document.getElementById('modal-retirar');
    if(modalRetirar) {
        document.getElementById('retirar-id').value = id;
        modalRetirar.classList.remove('hidden');
    }
};

window.confirmarRetiro = async function() {
    const id = document.getElementById('retirar-id').value;
    try {
        const res = await fetch(`/api/licencias/${id}/retirar`, { method: 'PUT', headers: authHeaders() });
        if(res.ok) {
            document.getElementById('modal-retirar').classList.add('hidden');
            mostrarNotificacion("Licencia retirada", "warning");
            loadLicenciasGrid();
        }
    } catch(e) {}
};

window.abrirModalRenovar = function(id) {
    const modalRenovar = document.getElementById('modal-renovar');
    if(modalRenovar) {
        document.getElementById('renovar-id').value = id;
        document.getElementById('renovar-fecha').value = '';
        modalRenovar.classList.remove('hidden');
    }
};

window.confirmarRenovacion = async function() {
    const id = document.getElementById('renovar-id').value;
    const nueva_fecha = document.getElementById('renovar-fecha').value;
    if(!nueva_fecha) return mostrarNotificacion("Seleccione nueva fecha.", "warning");
    try {
        const res = await fetch(`/api/licencias/${id}/renovar`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ nueva_fecha }) });
        if(res.ok) {
            document.getElementById('modal-renovar').classList.add('hidden');
            mostrarNotificacion("Licencia renovada con éxito", "success");
            loadLicenciasGrid();
        }
    } catch(e) {}
};

window.verDetalleLicencia = function(id) {
    const l = cacheLicencias.find(item => item.id == id);
    if(!l) return;
    const bodyModal = document.getElementById('detalle-licencia-body');
    if(bodyModal) {
        bodyModal.innerHTML = `
            <div><strong>Software:</strong><br>${l.software}</div>
            <div><strong>Clave / Serial:</strong><br>${l.serial || l.clave || 'N/A'}</div>
            <div><strong>Responsable:</strong><br>${l.departamento || l.responsable || 'N/A'}</div>
            <div><strong>Vencimiento:</strong><br>${l.fecha_vencimiento ? l.fecha_vencimiento.split('T')[0] : 'Indefinida'}</div>
            <div><strong>Estatus:</strong><br><span class="badge badge-success">${l.estatus || 'Activa'}</span></div>
        `;
        document.getElementById('modal-detalle-licencia').classList.remove('hidden');
    }
};