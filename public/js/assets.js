document.addEventListener("DOMContentLoaded", () => {
    cargarInventario();
    cargarDepartamentosSelect();
    configurarSelectorSudebip();
});

async function cargarInventario() {
    try {
        const res = await fetch('/api/bienes', { headers: authHeaders() });
        const bienes = await res.json();
        renderTablaBienes(bienes);
    } catch(e) {
        console.error("Error al cargar inventario:", e);
    }
}

function renderTablaBienes(bienes) {
    window._bienesCache = bienes; 
    const tbody = document.getElementById('tabla-bienes');
    if(!tbody) return;

    tbody.innerHTML = bienes.map(b => `
        <tr class="clickable-row" onclick="abrirDetalleBienPorId(${b.id})" style="cursor: pointer;">
            <td><b>${b.codigo_bien || b.codigo || '-'}</b></td>
            <td><b>${b.descripcion || '-'}</b><br><small style="color:var(--text-muted);">Serial: ${b.serial || 'S/N'}</small></td>
            <td>${b.departamento || 'General'}</td>
            <td><span class="badge badge-${(b.estado||'Activo').toLowerCase() === 'activo' ? 'success' : 'danger'}">${b.estado || 'ACTIVO'}</span></td>
            <td>
                <div style="display:flex; gap:6px; flex-wrap:wrap;" onclick="event.stopPropagation()">
                    <button type="button" onclick="abrirDetalleBienPorId(${b.id})" class="btn-primary" style="padding:5px 10px; font-size:11px; background:#0284c7;" title="Ver fotos y descripción completa"><span class="material-icons" style="font-size:14px; vertical-align:middle;">visibility</span> Fotos</button>
                    <button type="button" onclick="abrirTraspasoModal(${b.id})" class="btn-primary" style="padding:5px 10px; font-size:11px;">Traspasar</button>
                    <button type="button" onclick="abrirDesincorporarModal(${b.id})" class="btn-danger" style="padding:5px 10px; font-size:11px;">Desincorporar</button>
                    <button type="button" onclick="abrirEnajenacionModal(${b.id})" class="btn-warning" style="padding:5px 10px; font-size:11px; background:#f59e0b; color:#fff;">Enajenar</button>
                </div>
            </td>
        </tr>
    `).join('') || `<tr><td colspan="5" style="text-align:center; padding:20px;">No hay bienes registrados.</td></tr>`;
}

function filterBienes() {
    const query = document.getElementById('search-input').value.toLowerCase();
    if (!window._bienesCache) return;
    const filtrados = window._bienesCache.filter(b => 
        (b.codigo_bien && b.codigo_bien.toLowerCase().includes(query)) ||
        (b.codigo && b.codigo.toLowerCase().includes(query)) ||
        (b.descripcion && b.descripcion.toLowerCase().includes(query)) ||
        (b.serial && b.serial.toLowerCase().includes(query))
    );
    renderTablaBienes(filtrados);
}

function configurarSelectorSudebip() {
    const selectSudebip = document.getElementById('b-sudebip');
    if (selectSudebip) {
        selectSudebip.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val) {
                const partes = val.split('|');
                const codigoSub = partes[0] ? partes[0].trim() : '';
                const descSub = partes[1] ? partes[1].trim() : '';
                if(document.getElementById('b-grupo')) document.getElementById('b-grupo').value = codigoSub;
                if(document.getElementById('b-subgrupo')) document.getElementById('b-subgrupo').value = descSub;
            } else {
                if(document.getElementById('b-grupo')) document.getElementById('b-grupo').value = '';
                if(document.getElementById('b-subgrupo')) document.getElementById('b-subgrupo').value = '';
            }
        });
    }
}

async function cargarDepartamentosSelect() {
    try {
        const res = await fetch('/api/departamentos', { headers: authHeaders() });
        const deptoList = await res.json();
        const selects = document.querySelectorAll('.select-dptos');
        selects.forEach(sel => {
            sel.innerHTML = '<option value="">Seleccione Departamento...</option>' + 
                deptoList.map(d => `<option value="${d.nombre}">${d.nombre}</option>`).join('');
        });
    } catch(e) {}
}

function procesarImagenesComprimidas(input) {
    const previewContainer = document.getElementById('preview-container');
    const labelText = document.getElementById('file-label-text');
    if(previewContainer) previewContainer.innerHTML = '';
    window.imagenesComprimidasBase64 = [];

    if (input.files && input.files.length > 0) {
        if(labelText) labelText.innerText = `${input.files.length} imagen(es) seleccionada(s) y comprimidas`;

        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.src = e.target.result;
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 900; 

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
                    window.imagenesComprimidasBase64.push(compressedDataUrl);

                    if(previewContainer) {
                        const thumbDiv = document.createElement('div');
                        thumbDiv.className = 'image-preview-item';
                        thumbDiv.innerHTML = `<img src="${compressedDataUrl}" alt="Evidencia comprimida">`;
                        previewContainer.appendChild(thumbDiv);
                    }
                }
            }
            reader.readAsDataURL(file);
        });
    }
}

async function addBien() {
    const codigo_bien = document.getElementById('b-codigo').value.trim();
    const descripcion = document.getElementById('b-desc').value.trim();
    const serial = document.getElementById('b-serial').value.trim();
    const departamento = document.getElementById('b-dpto').value;
    const valor = document.getElementById('b-valor').value.trim();

    if(!codigo_bien || !descripcion) {
        return mostrarNotificacion("Complete el código patrimonial y la descripción.", "warning");
    }

    const imagenes = window.imagenesComprimidasBase64 || [];

    try {
        const res = await fetch('/api/bienes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({
                codigo_bien,
                descripcion,
                serial,
                departamento: departamento || 'General',
                valor: valor ? Number(valor) : 0,
                imagenes
            })
        });

        if(res.ok) {
            mostrarNotificacion("Bien registrado exitosamente.", "success");
            document.getElementById('b-codigo').value = '';
            document.getElementById('b-desc').value = '';
            document.getElementById('b-serial').value = '';
            document.getElementById('b-valor').value = '';
            document.getElementById('b-fotos').value = '';
            if(document.getElementById('preview-container')) document.getElementById('preview-container').innerHTML = '';
            if(document.getElementById('file-label-text')) document.getElementById('file-label-text').innerText = "Haga clic para seleccionar fotografías (Se comprimirán automáticamente)";
            window.imagenesComprimidasBase64 = [];
            cargarInventario();
        } else {
            const err = await res.json();
            mostrarNotificacion(err.error || "Error al registrar el bien.", "error");
        }
    } catch(e) {
        mostrarNotificacion("Error de conexión al guardar el bien.", "error");
    }
}

function abrirDetalleBienPorId(id) {
    if (!window._bienesCache) return;
    const bien = window._bienesCache.find(b => b.id === id);
    if(!bien) return;

    const modal = document.getElementById('modal-detalle-bien');
    const contenido = document.getElementById('modal-contenido');
    if(!modal || !contenido) return;

    let fotosHtml = '<p style="color:var(--text-muted); font-style:italic;">No hay fotografías adjuntas para este bien.</p>';
    if(bien.imagenes) {
        try {
            const imgs = typeof bien.imagenes === 'string' ? JSON.parse(bien.imagenes) : bien.imagenes;
            if(Array.isArray(imgs) && imgs.length > 0) {
                fotosHtml = `<div class="image-preview-grid">${imgs.map(src => `<div class="image-preview-item" style="height:130px;"><img src="${src}" alt="Foto bien" onclick="window.open(this.src)" title="Haga clic para ampliar imagen"></div>`).join('')}</div>`;
            }
        } catch(e) {}
    }

    contenido.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; background:var(--bg-main); padding:18px; border-radius:10px; border:1px solid var(--border);">
            <div><span style="color:var(--text-muted); font-size:12px; display:block;">Código Patrimonial:</span><strong style="font-size:16px; color:var(--primary);">${bien.codigo_bien || bien.codigo || '-'}</strong></div>
            <div><span style="color:var(--text-muted); font-size:12px; display:block;">Estatus / Estado:</span><span class="badge badge-success">${bien.estado || 'ACTIVO'}</span></div>
            <div style="grid-column: span 2;"><span style="color:var(--text-muted); font-size:12px; display:block;">Descripción Completa del Activo:</span><p style="font-size:15px; font-weight:600; margin:4px 0 0 0; line-height:1.5;">${bien.descripcion || '-'}</p></div>
            <div><span style="color:var(--text-muted); font-size:12px; display:block;">Serial de Fábrica:</span><code>${bien.serial || 'S/N'}</code></div>
            <div><span style="color:var(--text-muted); font-size:12px; display:block;">Ubicación / Departamento:</span>${bien.departamento || 'General'}</div>
            <div><span style="color:var(--text-muted); font-size:12px; display:block;">Valor Estimado:</span>$${Number(bien.valor || 0).toLocaleString('es-VE', {minimumFractionDigits: 2})}</div>
            <div><span style="color:var(--text-muted); font-size:12px; display:block;">Fecha de Incorporación:</span>${bien.fecha_incorporacion ? bien.fecha_incorporacion.split('T')[0] : 'No registrada'}</div>
        </div>
        <h4 style="margin: 0 0 10px 0; font-size:14px; display:flex; align-items:center; gap:6px;">
            <span class="material-icons" style="font-size:18px; color:var(--primary);">photo_library</span> Fotografías / Evidencias Cargadas:
        </h4>
        ${fotosHtml}
    `;

    modal.classList.remove('hidden');
}

function cerrarModalDetalle() {
    const modal = document.getElementById('modal-detalle-bien');
    if(modal) modal.classList.add('hidden');
}

// ----------------------------------------------------
// ACCIONES Y MODALES (Traspaso corregido)
// ----------------------------------------------------

window.abrirTraspasoModal = function(id) {
    const inputId = document.getElementById('traspaso-bien-id');
    const modal = document.getElementById('modal-traspaso');
    if(inputId) inputId.value = id;
    if(modal) modal.classList.remove('hidden');
    cargarDepartamentosSelect();
};

window.cerrarTraspasoModal = function() {
    const modal = document.getElementById('modal-traspaso');
    if(modal) modal.classList.add('hidden');
};

window.ejecutarTraspasoDirecto = async function() {
    const idElem = document.getElementById('traspaso-bien-id');
    const deptoElem = document.getElementById('traspaso-dpto-destino');
    if(!idElem || !deptoElem) return;

    const id = idElem.value;
    const departamento_destino = deptoElem.value;
    if(!departamento_destino) return mostrarNotificacion("Seleccione un departamento de destino.", "warning");

    try {
        const res = await fetch(`/api/traspasar`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ id: Number(id), departamento_destino })
        });
        if(res.ok) {
            mostrarNotificacion("Traspaso ejecutado con éxito.", "success");
            cerrarTraspasoModal();
            cargarInventario();
        } else {
            const err = await res.json();
            mostrarNotificacion(err.error || "Error al ejecutar traspaso.", "error");
        }
    } catch(e) {
        mostrarNotificacion("Error de conexión.", "error");
    }
};

window.abrirDesincorporarModal = function(id) {
    const inputId = document.getElementById('desincorporar-bien-id');
    const modal = document.getElementById('modal-desincorporar-confirm');
    if(inputId) inputId.value = id;
    if(modal) modal.classList.remove('hidden');
};

window.cerrarModalDesincorporacion = function() {
    const modal = document.getElementById('modal-desincorporar-confirm');
    if(modal) modal.classList.add('hidden');
};

window.confirmarDesincorporacionModal = async function() {
    const idElem = document.getElementById('desincorporar-bien-id');
    if(!idElem) return;
    const id = idElem.value;

    try {
        const res = await fetch(`/api/desincorporar/${id}`, {
            method: 'POST',
            headers: authHeaders()
        });
        if(res.ok) {
            mostrarNotificacion("Bien desincorporado correctamente.", "success");
            cerrarModalDesincorporacion();
            cargarInventario();
        } else {
            mostrarNotificacion("Error al desincorporar.", "error");
        }
    } catch(e) {
        mostrarNotificacion("Error de conexión.", "error");
    }
};

window.abrirEnajenacionModal = function(id) {
    const inputId = document.getElementById('enajenacion-bien-id');
    const modal = document.getElementById('modal-enajenacion');
    if(inputId) inputId.value = id;
    if(modal) modal.classList.remove('hidden');
};

window.cerrarEnajenacionModal = function() {
    const modal = document.getElementById('modal-enajenacion');
    if(modal) modal.classList.add('hidden');
};

window.ejecutarEnajenacionDirecta = async function() {
    const idElem = document.getElementById('enajenacion-bien-id');
    const motivoElem = document.getElementById('enajenacion-motivo');
    if(!idElem || !motivoElem) return;

    const id = idElem.value;
    const motivo = motivoElem.value.trim();
    if(!motivo) return mostrarNotificacion("Ingrese el motivo de la enajenación.", "warning");

    try {
        const res = await fetch(`/api/enajenar`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ id: Number(id), motivo })
        });
        if(res.ok) {
            mostrarNotificacion("Bien enajenado correctamente.", "success");
            cerrarEnajenacionModal();
            cargarInventario();
        } else {
            mostrarNotificacion("Error al enajenar el bien.", "error");
        }
    } catch(e) {
        mostrarNotificacion("Error de conexión.", "error");
    }
};