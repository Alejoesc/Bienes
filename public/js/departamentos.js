document.addEventListener("DOMContentLoaded", () => {
    loadDepartamentosList();
});

async function loadDepartamentosList() {
    try {
        const res = await fetch('/api/departamentos', { headers: authHeaders() });
        if (!res.ok) throw new Error('Error al cargar departamentos');
        const list = await res.json();
        
        const tbody = document.getElementById('tabla-dptos');
        if (!tbody) return;

        tbody.innerHTML = list.map(d => `
            <tr>
                <td><strong>#${d.id}</strong></td>
                <td>${d.nombre}</td>
                <td>
                    <button onclick="eliminarDepartamento(${d.id})" class="btn-danger" style="padding: 6px 12px; font-size: 12px;">Eliminar</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="3" style="text-align:center; padding: 20px; color: var(--text-muted);">No hay departamentos registrados.</td></tr>';
    } catch(e) {
        console.error("Error al cargar departamentos:", e);
    }
}

async function addDepartamento() {
    // Captura segura del input utilizando el ID o por selector de tipo texto
    const input = document.getElementById('d-nombre') || document.querySelector('.card-form input[type="text"]');
    const nombre = input ? input.value.trim() : '';

    if (!nombre) {
        return mostrarNotificacion("Ingrese el nombre del departamento.", "warning");
    }

    try {
        const res = await fetch('/api/departamentos', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ nombre })
        });

        if (res.ok) {
            mostrarNotificacion("Departamento registrado con éxito.", "success");
            if (input) input.value = '';
            loadDepartamentosList();
        } else {
            const err = await res.json();
            mostrarNotificacion(err.error || "Error al registrar el departamento.", "error");
        }
    } catch(e) {
        mostrarNotificacion("Error de conexión con el servidor.", "error");
    }
}

async function eliminarDepartamento(id) {
    if (!confirm("¿Está seguro de eliminar este departamento?")) return;

    try {
        const res = await fetch(`/api/departamentos/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        });

        if (res.ok) {
            mostrarNotificacion("Departamento eliminado correctamente.", "success");
            loadDepartamentosList();
        } else {
            mostrarNotificacion("No se pudo eliminar el departamento.", "error");
        }
    } catch(e) {
        mostrarNotificacion("Error de conexión.", "error");
    }
}