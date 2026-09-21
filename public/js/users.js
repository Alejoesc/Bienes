window.loadUsuariosGrid = async function() {
    try {
        const res = await fetch('/api/usuarios', { headers: authHeaders() });
        const users = await res.json();
        const tbody = document.getElementById('tabla-usuarios');
        if(!tbody) return;
        tbody.innerHTML = users.map(u => `
            <tr style="cursor:pointer;" onclick='verDetalleUsuario(${JSON.stringify(u)})' title="Haz clic para ver la descripción completa">
                <td><strong>${u.cedula || '-'}</strong></td>
                <td><strong>${u.nombre}</strong><br><small>${u.username}</small></td>
                <td>${u.departamento || '-'}<br><span class="badge badge-primary">${(u.role || 'viewer').toUpperCase()}</span></td>
                <td onclick="event.stopPropagation()">
                    <button onclick='abrirModalUsuario(${JSON.stringify(u)})' class="btn-warning" style="padding:6px 12px; font-size:12px;">Editar</button>
                </td>
            </tr>
        `).join('');
    } catch(e) {}
};

window.verDetalleUsuario = function(u) {
    const modal = document.getElementById('modal-detalle-usuario');
    if(!modal) return;
    
    let permisosParsed = [];
    try {
        permisosParsed = typeof u.permisos === 'string' ? JSON.parse(u.permisos) : (u.permisos || []);
    } catch(e) { permisosParsed = []; }

    const mapaPermisos = {
        'inventario': 'Gestión de Inventario Físico y Traspasos',
        'compras': 'Módulo de Compras y Requisiciones',
        'licencias': 'Control y Vencimiento de Licencias Software',
        'contabilidad': 'Registro Contable y Reportes en Divisas',
        'enajenacion': 'Procesamiento de Enajenaciones y Bajas',
        'auditoria': 'Monitoreo de Auditoría Institucional',
        'sistema': 'Herramientas de Sistema (Excel, Respaldos SQL)'
    };

    const permisosHtml = permisosParsed.length > 0 
        ? permisosParsed.map(p => `<li><span class="material-icons" style="font-size:16px; color:var(--success); vertical-align:middle;">check_circle</span> ${mapaPermisos[p] || p}</li>`).join('')
        : '<p style="color:var(--text-muted); grid-column: span 2;">Sin permisos específicos asignados.</p>';

    const body = document.getElementById('detalle-usuario-body');
    body.innerHTML = `
        <div><strong>Cédula:</strong><br>${u.cedula || 'N/A'}</div>
        <div><strong>Nombre Completo:</strong><br>${u.nombre || 'N/A'}</div>
        <div><strong>Nombre de Usuario:</strong><br><code>${u.username || 'N/A'}</code></div>
        <div><strong>Correo Electrónico:</strong><br>${u.correo || 'N/A'}</div>
        <div><strong>Departamento:</strong><br>${u.departamento || 'General'}</div>
        <div><strong>Rol del Sistema:</strong><br><span class="badge badge-primary">${(u.role || 'viewer').toUpperCase()}</span></div>
        <div style="grid-column: span 2; background: var(--table-header); padding: 15px; border-radius: 10px; margin-top: 10px;">
            <strong>Permisos Habilitados:</strong>
            <ul style="list-style: none; padding: 0; margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                ${permisosHtml}
            </ul>
        </div>
    `;
    modal.classList.remove('hidden');
};

window.cerrarModalDetalleUsuario = function() {
    const modal = document.getElementById('modal-detalle-usuario');
    if(modal) modal.classList.add('hidden');
};

window.loadDptosSelects = async function() {
    try {
        const res = await fetch('/api/departamentos', { headers: authHeaders() });
        const dptos = await res.json();
        const sel = document.getElementById('u-dpto');
        if(sel) sel.innerHTML = '<option value="">Departamento...</option>' + dptos.map(d => `<option value="${d.nombre}">${d.nombre}</option>`).join('');
    } catch(e){}
};

window.abrirModalUsuario = function(u = null) {
    document.getElementById('modal-usuario').classList.remove('hidden');
    
    document.querySelectorAll('.perm-checkbox').forEach(cb => cb.checked = false);

    if(u) {
        document.getElementById('u-id').value = u.id;
        document.getElementById('u-cedula').value = u.cedula || '';
        document.getElementById('u-nombre-comp').value = u.nombre || '';
        document.getElementById('u-correo').value = u.correo || '';
        document.getElementById('u-dpto').value = u.departamento || '';
        document.getElementById('u-nombre').value = u.username || '';
        document.getElementById('u-pass').value = '';
        document.getElementById('u-rol').value = u.role || 'viewer';

        if(u.permisos) {
            try {
                const listaPermisos = typeof u.permisos === 'string' ? JSON.parse(u.permisos) : u.permisos;
                if(Array.isArray(listaPermisos)) {
                    listaPermisos.forEach(p => {
                        const chk = document.getElementById('perm_' + p);
                        if(chk) chk.checked = true;
                    });
                }
            } catch(err) {}
        }
    } else {
        document.getElementById('u-id').value = '';
        document.getElementById('u-cedula').value = '';
        document.getElementById('u-nombre-comp').value = '';
        document.getElementById('u-correo').value = '';
        document.getElementById('u-dpto').value = '';
        document.getElementById('u-nombre').value = '';
        document.getElementById('u-pass').value = '';
        document.getElementById('u-rol').value = 'viewer';
    }
};

window.cerrarModalUsuario = () => document.getElementById('modal-usuario').classList.add('hidden');

window.saveUser = async function() {
    const id = document.getElementById('u-id').value;
    
    const permisosSeleccionados = [];
    document.querySelectorAll('.perm-checkbox:checked').forEach(cb => {
        permisosSeleccionados.push(cb.value);
    });

    const payload = { 
        cedula: document.getElementById('u-cedula').value, 
        nombre: document.getElementById('u-nombre-comp').value, 
        correo: document.getElementById('u-correo').value, 
        departamento: document.getElementById('u-dpto').value, 
        username: document.getElementById('u-nombre').value, 
        role: document.getElementById('u-rol').value,
        permisos: permisosSeleccionados 
    };
    
    const pass = document.getElementById('u-pass').value;
    if(pass) payload.password = pass;

    const res = await fetch(id ? `/api/usuarios/${id}` : '/api/usuarios', {
        method: id ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
    });

    if(res.ok) {
        mostrarNotificacion("Usuario, rol y permisos guardados con éxito.", "success");
        cerrarModalUsuario();
        loadUsuariosGrid();
    } else { mostrarNotificacion("Error al guardar usuario.", "error"); }
};