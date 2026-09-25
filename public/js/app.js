const role = localStorage.getItem('role') || '';
const token = localStorage.getItem('token') || '';
const nombreUsuarioActual = localStorage.getItem('nombre') || '';
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` });

document.addEventListener("DOMContentLoaded", () => {
    if(!token && window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
        window.location.href = '/index.html';
    }
    if(token) {
        const userInfo = document.getElementById('user-info');
        const userRole = document.getElementById('user-role');
        const loginSection = document.getElementById('login-section');
        const dashSection = document.getElementById('dashboard-section');

        if(userInfo) userInfo.innerText = nombreUsuarioActual;
        if(userRole) userRole.innerText = `Rol: ${role.toUpperCase()}`;
        if(loginSection) loginSection.classList.add('hidden');
        if(dashSection) dashSection.classList.remove('hidden');

        if (role === 'admin') {
            document.querySelectorAll('#menu-contabilidad, #menu-usuarios, #menu-departamentos, #menu-auditoria, #menu-sistema').forEach(el => {
                if(el) el.classList.remove('hidden');
            });
        }
        
        inyectarComponentesGlobales();
        verificarNotificacionesGlobales();
        setInterval(verificarNotificacionesGlobales, 30000);
    }
    initTheme();
    limpiarElementosBasuraUI();
});

// INTERCEPTOR GLOBAL DE FETCH PARA MOSTRAR SPINNER DE CARGA AUTOMÁTICO
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    mostrarLoaderGlobal();
    try {
        const response = await originalFetch(...args);
        return response;
    } finally {
         ocultarLoaderGlobal();
    }
};

function mostrarLoaderGlobal() {
    if (document.getElementById('global-system-loader')) return;
    const loader = document.createElement('div');
    loader.id = 'global-system-loader';
    loader.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(3px);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        z-index: 999999; animation: fadeIn 0.15s ease;
    `;
    loader.innerHTML = `
        <div style="background: var(--bg-card, #0f172a); border: 1px solid var(--border); padding: 25px 35px; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 15px; color: var(--text-main, #fff);">
            <div style="width: 28px; height: 28px; border: 3px solid rgba(59,130,246,0.2); border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <span style="font-weight: 600; font-size: 14px; letter-spacing: 0.3px;">Procesando solicitud...</span>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    `;
    document.body.appendChild(loader);
}

function ocultarLoaderGlobal() {
    const loader = document.getElementById('global-system-loader');
    if (loader) loader.remove();
}

function limpiarElementosBasuraUI() {
    document.querySelectorAll('body > button, body > div[style*="position: fixed; top: 0"]').forEach(el => {
        if(el.id !== 'global-flotante-notif' && el.id !== 'modal-centro-notificaciones' && el.innerHTML.includes('dark_mode')) {
            el.remove();
        }
    });
}

function inyectarComponentesGlobales() {
    const sidebarHeader = document.querySelector('.sidebar-header');
    if (sidebarHeader && !document.getElementById('bcv-sidebar-tasas')) {
        sidebarHeader.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; width:100%; margin-bottom: 12px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="background:linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:bold; font-size:12px; border:1px solid rgba(255,255,255,0.2);">BCV</div>
                    <h2 style="margin:0; font-size:18px; letter-spacing:0.5px;">SGBN</h2>
                </div>
                <div style="display:flex; gap:6px;">
                    <button onclick="navegarA('manual.html')" title="Manual de Usuario" style="background: rgba(255,255,255,0.08); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.12); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;"><span class="material-icons" style="font-size: 16px;">menu_book</span></button>
                    <button onclick="toggleTheme()" title="Cambiar Tema" style="background: rgba(255,255,255,0.08); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.12); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;"><span class="material-icons" id="theme-icon-indicator" style="font-size: 16px;">dark_mode</span></button>
                </div>
            </div>
            
            <div id="bcv-sidebar-tasas" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 10px; padding: 10px 12px; font-size: 11.5px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; color: #94a3b8; font-weight: 600; text-transform: uppercase; font-size: 9.5px;">
                    <span>Tipo de Cambio Oficial</span>
                    <span style="color: #10b981; display:flex; align-items:center; gap:2px;"><span style="width:6px; height:6px; background:#10b981; border-radius:50%; display:inline-block;"></span> BCV</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; text-align: center;">
                    <div style="background: rgba(0,0,0,0.2); padding: 5px; border-radius: 6px;">
                        <span style="color: #cbd5e1; display: block; font-size: 10px;">USD ($)</span>
                        <strong id="bcv-usd-val" style="color: #38bdf8; font-size: 12px;">Cargando...</strong>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); padding: 5px; border-radius: 6px;">
                        <span style="color: #cbd5e1; display: block; font-size: 10px;">EUR (€)</span>
                        <strong id="bcv-eur-val" style="color: #fbbf24; font-size: 12px;">Cargando...</strong>
                    </div>
                </div>
            </div>
        `;
    }

    async function actualizarTasasBCV() {
        try {
            const [resDolar, resEuro] = await Promise.all([
                fetch('https://ve.dolarapi.com/v1/dolares/oficial'),
                fetch('https://ve.dolarapi.com/v1/euros/oficial')
            ]);
            const dataDolar = await resDolar.json();
            const dataEuro = await resEuro.json();
            if (document.getElementById('bcv-usd-val') && dataDolar.promedio) document.getElementById('bcv-usd-val').innerText = `Bs. ${Number(dataDolar.promedio).toFixed(2)}`;
            if (document.getElementById('bcv-eur-val') && dataEuro.promedio) document.getElementById('bcv-eur-val').innerText = `Bs. ${Number(dataEuro.promedio).toFixed(2)}`;
        } catch (e) {
            if (document.getElementById('bcv-usd-val')) { document.getElementById('bcv-usd-val').innerText = 'Bs. 36.50'; document.getElementById('bcv-eur-val').innerText = 'Bs. 39.80'; }
        }
    }
    actualizarTasasBCV();

    if (document.getElementById('global-flotante-notif')) return;
    const wrapper = document.createElement('div'); wrapper.id = 'global-flotante-notif';
    wrapper.innerHTML = `
        <button onclick="window.abrirModalNotificaciones()" style="position: fixed; bottom: 25px; right: 25px; background: var(--primary); color: #fff; border: none; border-radius: 50%; width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 8px 20px rgba(0,0,0,0.3); z-index: 9999;">
            <span class="material-icons" style="font-size: 26px;">notifications</span>
            <span id="global-notif-badge" style="position: absolute; top: -5px; right: -5px; background: var(--danger); color: #fff; font-size: 11px; font-weight: 700; border-radius: 50%; width:20px; height:20px; display: none; align-items:center; justify-content:center; border: 2px solid var(--bg-card);">0</span>
        </button>
        <div id="modal-centro-notificaciones" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(6px); display: none; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: var(--bg-card); width: 90%; max-width: 600px; border-radius: 20px; padding: 30px; box-shadow: 0 25px 50px rgba(0,0,0,0.4);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 15px; margin-bottom: 20px;">
                    <h3 style="color: var(--primary); margin: 0; display: flex; align-items: center; gap: 10px;"><span class="material-icons">notifications_active</span> Alertas del Sistema</h3>
                    <span class="material-icons" style="cursor: pointer; color: var(--text-muted);" onclick="window.cerrarModalNotificaciones()">close</span>
                </div>
                <div id="global-notif-body" style="max-height: 350px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;"></div>
                <div style="display: flex; justify-content: flex-end;"><button onclick="window.cerrarModalNotificaciones()" class="btn-primary" style="padding: 10px 20px;">Cerrar</button></div>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper); 
    actualizarIconoTemaUI();
}

window.abrirModalNotificaciones = function() {
    document.getElementById('modal-centro-notificaciones').style.display = 'flex';
    const badge = document.getElementById('global-notif-badge'); if (badge) badge.style.display = 'none';
    localStorage.setItem('notifs_seen_count', window._currentNotifCount || 0);
    verificarNotificacionesGlobales();
}
window.cerrarModalNotificaciones = function() { document.getElementById('modal-centro-notificaciones').style.display = 'none'; }

async function verificarNotificacionesGlobales() {
    try {
        const res = await fetch('/api/compras', { headers: authHeaders() });
        if(!res.ok) return;
        const compras = await res.json();
        let notifs = []; const r = role.toLowerCase();
        compras.forEach(c => {
            const estatus = (c.estado || '').toLowerCase();
            if((r === 'admin' || r === 'editor') && estatus === 'pendiente supervisor') notifs.push({...c, alerta: 'Requiere Aprobación'});
        });
        const body = document.getElementById('global-notif-body'); const badge = document.getElementById('global-notif-badge');
        if(!body || !badge) return;
        window._currentNotifCount = notifs.length;
        const seenCount = parseInt(localStorage.getItem('notifs_seen_count') || '0');
        if(notifs.length > seenCount) { badge.innerText = notifs.length - seenCount; badge.style.display = 'flex'; } else { badge.style.display = 'none'; }
        if(notifs.length === 0) { body.innerHTML = `<p style="text-align:center; color: var(--text-muted); padding: 15px;">No hay alertas pendientes.</p>`; return; }
        body.innerHTML = notifs.map(c => `
            <div style="padding: 14px; border: 1px solid var(--border); border-left: 4px solid var(--primary); border-radius: 10px; background: var(--bg-main);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <strong style="font-size: 14px; color: var(--text-main);">${c.descripcion}</strong><span class="badge" style="background: var(--warning); color: #fff;">${c.estado}</span>
                </div>
                <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px; color: var(--primary);">${c.alerta}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 8px;">
                    <span>Solicitante: <strong>${c.solicitante}</strong></span>
                    <button onclick="window.location.href='/compras.html?open=${c.id}'" class="btn-primary" style="padding: 4px 10px; font-size: 11px;">Revisar</button>
                </div>
            </div>
        `).join('');
    } catch(e) {}
}

function initTheme() { document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'dark'); actualizarIconoTemaUI(); }
window.toggleTheme = function() { const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', newTheme); localStorage.setItem('theme', newTheme); actualizarIconoTemaUI(); }
function actualizarIconoTemaUI() { const iconEl = document.getElementById('theme-icon-indicator'); if (iconEl) iconEl.innerText = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light_mode' : 'dark_mode'; }
window.mostrarNotificacion = function(mensaje, tipo = 'success') {
    let container = document.querySelector('.sgbn-toast-container');
    if (!container) { container = document.createElement('div'); container.className = 'sgbn-toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div'); toast.className = `sgbn-toast ${tipo}`; toast.innerHTML = `<span>${mensaje}</span>`;
    container.appendChild(toast); setTimeout(() => toast.remove(), 4000);
}

// MODAL DE BIENVENIDA ESTÉTICO (SOLO LA PRIMERA VEZ QUE INICIA SESIÓN)
function mostrarModalBienvenida(nombre, rol) {
    if (sessionStorage.getItem('bienvenida_mostrada') === 'true') return;
    sessionStorage.setItem('bienvenida_mostrada', 'true');

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; z-index: 999999;
        animation: fadeIn 0.3s ease;
    `;
    overlay.innerHTML = `
        <div style="background: var(--bg-card, #0f172a); border: 1px solid var(--border, rgba(255,255,255,0.1)); border-top: 6px solid #1e3a8a; border-radius: 20px; width: 90%; max-width: 480px; padding: 40px; text-align: center; box-shadow: 0 25px 60px rgba(0,0,0,0.6); color: var(--text-main, #fff);">
            <div style="width: 76px; height: 76px; margin: 0 auto 20px; border-radius: 50%; background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 24px; border: 2px solid rgba(255,255,255,0.2); box-shadow: 0 8px 20px rgba(30,58,138,0.4);">BCV</div>
            <h2 style="margin: 0 0 10px 0; font-size: 22px; color: var(--primary, #3b82f6);">¡Bienvenido al SGBN!</h2>
            <p style="color: var(--text-muted, #94a3b8); font-size: 14px; margin-bottom: 20px;">Sistema de Gestión de Bienes Nacionales</p>
            <div style="background: var(--bg-main, rgba(255,255,255,0.03)); border: 1px solid var(--border); padding: 15px; border-radius: 12px; margin-bottom: 25px;">
                <strong style="font-size: 16px; display: block; color: var(--text-main); margin-bottom: 4px;">${nombre}</strong>
                <span class="badge" style="background: #1e3a8a; color: #fff; padding: 4px 12px; font-size: 11.5px; font-weight: bold; border-radius: 6px; text-transform: uppercase;">Rol: ${rol}</span>
            </div>
            <button onclick="this.closest('div').parentElement.remove()" class="btn-primary" style="width: 100%; justify-content: center; padding: 14px; font-size: 15px; border-radius: 10px; background: #1e3a8a; font-weight: bold;">Acceder al Sistema</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

window.login = async function() {
    const u = document.getElementById('username').value.trim(); const p = document.getElementById('password').value.trim();
    if(!u || !p) return window.mostrarNotificacion("Ingrese usuario y contraseña.", "warning");
    try {
        const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username:u, password:p }) });
        const data = await res.json();
        if(res.ok) { 
            localStorage.setItem('token', data.token); 
            localStorage.setItem('role', data.role); 
            localStorage.setItem('nombre', data.nombre); 
            localStorage.setItem('departamento', data.departamento); 
            sessionStorage.removeItem('bienvenida_mostrada'); // Permite mostrar el modal sólo en este nuevo inicio de sesión
            
            window.location.reload(); 
        } else { 
            window.mostrarNotificacion(data.error || "Credenciales inválidas.", "error"); 
        }
    } catch(e) { window.mostrarNotificacion("Error de conexión.", "error"); }
};

document.addEventListener("DOMContentLoaded", () => {
    if(token && nombreUsuarioActual) {
        setTimeout(() => { mostrarModalBienvenida(nombreUsuarioActual, role.toUpperCase()); }, 300);
    }
});

window.logout = async function() { 
    try { await fetch('/api/logout', { method: 'POST', headers: authHeaders() }); } catch(e){} 
    localStorage.clear(); 
    sessionStorage.clear(); 
    window.location.href = '/index.html'; 
}

window.navegarA = function(seccion) { window.location.href = seccion === 'resumen' ? '/index.html' : `/${seccion}`; }