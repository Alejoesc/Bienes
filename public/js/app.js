const role = localStorage.getItem('role') || '';
const token = localStorage.getItem('token') || '';
const nombreUsuarioActual = localStorage.getItem('nombre') || '';

const authHeaders = () => ({ 
    'Content-Type': 'application/json', 
    'Authorization': `Bearer ${token}` 
});

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
            ['menu-contabilidad', 'menu-usuarios', 'menu-departamentos', 'menu-auditoria', 'menu-sistema'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.classList.remove('hidden');
            });
        }

        inyectarCampanaFlotanteYTema();
        verificarNotificacionesGlobales();
        verificarBienvenidaPrimerInicioModal();
    }

    initTheme();
    loadBCVTicker();
});

// Modal de bienvenida al iniciar sesión por primera vez
function verificarBienvenidaPrimerInicioModal() {
    const claveSesionBienvenida = 'bienvenida_vista_modal_' + nombreUsuarioActual;
    if (!localStorage.getItem(claveSesionBienvenida)) {
        localStorage.setItem(claveSesionBienvenida, 'true');
        
        let descripcionRol = "Analista del Sistema";
        const r = role.toLowerCase();
        if (r === 'admin') descripcionRol = "Administrador General";
        else if (r === 'editor') descripcionRol = "Supervisor Operativo";
        else if (r === 'almacenista') descripcionRol = "Operador de Almacén";
        else if (r === 'contador') descripcionRol = "Analista Financiero/Contable";
        else if (r === 'auditor') descripcionRol = "Auditor Institucional";

        const modalBienvenida = document.createElement('div');
        modalBienvenida.id = 'modal-bienvenida-inicial';
        modalBienvenida.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 20000; animation: fadeIn 0.3s ease;";
        modalBienvenida.innerHTML = `
            <div style="background: var(--bg-card); width: 90%; max-width: 500px; border-radius: 20px; padding: 35px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); border: 1px solid var(--border); text-align: center;">
                <span class="material-icons" style="font-size: 56px; color: var(--primary); margin-bottom: 15px;">verified_user</span>
                <h2 style="color: var(--text-main); margin-bottom: 10px; font-size: 22px;">¡Bienvenido/a al Sistema, ${nombreUsuarioActual}!</h2>
                <p style="color: var(--text-muted); font-size: 14.5px; line-height: 1.6; margin-bottom: 20px;">
                    Has ingresado exitosamente al Sistema de Gestión de Bienes Nacionales (SGBN) con el rol de <strong>${descripcionRol}</strong>.
                </p>
                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                    <button onclick="window.location.href='/manual.html'" class="btn-primary" style="padding: 12px 20px; font-size: 14.5px; justify-content: center; display: flex; align-items: center; gap: 8px; background: var(--success); border:none; color:#fff; border-radius:10px; cursor:pointer;">
                        <span class="material-icons" style="font-size: 18px;">menu_book</span> Revisar Manual del Sistema
                    </button>
                    <button onclick="document.getElementById('modal-bienvenida-inicial').remove()" class="btn-primary" style="padding: 12px 20px; font-size: 14.5px; justify-content: center; border:none; border-radius:10px; cursor:pointer;">
                        Comenzar a Trabajar
                    </button>
                </div>
                <p style="color: var(--text-muted); font-size: 12px; border-top: 1px solid var(--border); padding-top: 15px; margin: 0;">
                    💡 En el botón de notificaciones (campana inferior derecha) podrás revisar el manual en otra ocasión.
                </p>
            </div>
        `;
        document.body.appendChild(modalBienvenida);
    }
}

function inyectarCampanaFlotanteYTema() {
    if (document.getElementById('global-flotante-notif')) return;

    // Botón de Modo Oscuro/Claro unificado justo al lado de SGBN en la cabecera lateral
    const sidebarHeader = document.querySelector('.sidebar-header');
    if (sidebarHeader) {
        sidebarHeader.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span class="material-icons">inventory_2</span>
                    <h2 style="margin:0; font-size:20px;">SGBN</h2>
                </div>
                <button onclick="toggleTheme()" style="background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;" title="Cambiar Tema Claro / Oscuro">
                    <span class="material-icons" id="theme-icon-indicator" style="font-size: 18px;">dark_mode</span>
                </button>
            </div>
        `;
    }

    const sidebarContent = document.querySelector('.sidebar-content');
    if (sidebarContent && !document.querySelector('.sidebar-bcv-ticker') && !document.getElementById('sidebar-bcv-fixed')) {
        const tickerDiv = document.createElement('div');
        tickerDiv.id = 'sidebar-bcv-fixed';
        tickerDiv.className = 'sidebar-bcv-ticker';
        tickerDiv.style.marginBottom = '20px';
        tickerDiv.innerHTML = `
            <div class="ticker-title"><span class="material-icons" style="font-size: 16px;">account_balance</span> TASA OFICIAL BCV</div>
            <div id="tasa-bcv-text" class="ticker-values">Consultando...</div>
        `;
        
        const userProfile = sidebarContent.querySelector('.user-profile');
        if (userProfile && userProfile.nextSibling) {
            sidebarContent.insertBefore(tickerDiv, userProfile.nextSibling);
        } else {
            sidebarContent.prepend(tickerDiv);
        }
        loadBCVTicker();
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'global-flotante-notif';
    wrapper.innerHTML = `
        <button onclick="abrirModalNotificaciones()" style="position: fixed; bottom: 25px; right: 25px; background: var(--primary); color: #fff; border: none; border-radius: 50%; width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 8px 20px rgba(0,0,0,0.3); z-index: 9999;" title="Centro de Notificaciones">
            <span class="material-icons" style="font-size: 26px;">notifications</span>
            <span id="global-notif-badge" style="position: absolute; top: 3px; right: 3px; background: var(--danger); color: #fff; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 50%; display: none; border: 2px solid var(--bg-card);">0</span>
        </button>

        <div id="modal-centro-notificaciones" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(6px); display: none; align-items: center; justify-content: center; z-index: 10000; animation: fadeIn 0.2s ease;">
            <div style="background: var(--bg-card); width: 90%; max-width: 600px; border-radius: 20px; padding: 30px; box-shadow: 0 25px 50px rgba(0,0,0,0.4); border: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 15px; margin-bottom: 20px;">
                    <h3 style="color: var(--primary); margin: 0; display: flex; align-items: center; gap: 10px;">
                        <span class="material-icons" style="font-size: 26px;">notifications_active</span> Centro de Notificaciones y Alertas
                    </h3>
                    <span class="material-icons" style="cursor: pointer; font-size: 28px; color: var(--text-muted);" onclick="cerrarModalNotificaciones()">close</span>
                </div>
                
                <div id="global-notif-body" style="max-height: 260px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; font-size: 14px; margin-bottom: 20px;">
                    <p style="text-align:center; color: var(--text-muted); padding: 20px;">Cargando notificaciones...</p>
                </div>

                <div style="background: var(--bg-main); border: 1px solid var(--border); border-radius: 12px; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="material-icons" style="color: var(--primary); font-size: 22px;">menu_book</span>
                        <div>
                            <div style="font-size: 13.5px; font-weight: 600; color: var(--text-main);">Guía y Manual del Sistema</div>
                            <div style="font-size: 11.5px; color: var(--text-muted);">Consulta las funciones y roles operativos</div>
                        </div>
                    </div>
                    <button onclick="window.location.href='/manual.html'" class="btn-primary" style="padding: 6px 14px; font-size: 12.5px; display: flex; align-items: center; gap: 4px;">
                        <span class="material-icons" style="font-size: 15px;">visibility</span> Ver Manual
                    </button>
                </div>

                <div style="display: flex; justify-content: flex-end;">
                    <button onclick="cerrarModalNotificaciones()" class="btn-primary" style="padding: 10px 20px;">Cerrar Ventana</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);
    actualizarIconoTemaUI();
}

window.abrirModalNotificaciones = function() {
    const modal = document.getElementById('modal-centro-notificaciones');
    if (modal) modal.style.display = 'flex';

    const badge = document.getElementById('global-notif-badge');
    if (badge) {
        badge.innerText = '0';
        badge.style.display = 'none';
    }
    
    localStorage.setItem('notifs_leidas_ts_' + nombreUsuarioActual, Date.now());
    verificarNotificacionesGlobales();
}

window.cerrarModalNotificaciones = function() {
    const modal = document.getElementById('modal-centro-notificaciones');
    if (modal) modal.style.display = 'none';
}

async function verificarNotificacionesGlobales() {
    try {
        const res = await fetch('/api/compras', { headers: authHeaders() });
        if(!res.ok) return;
        const compras = await res.json();
        
        const misRequisicionesPendientes = compras.filter(c => {
            const esMio = (c.solicitante || '').toLowerCase() === nombreUsuarioActual.toLowerCase();
            const estatus = (c.estado || c.estatus || '').toLowerCase();
            const esDefinitivo = estatus.includes('aprobado') || estatus.includes('completado') || estatus.includes('rechazado');
            
            return esMio && !esDefinitivo;
        });

        const body = document.getElementById('global-notif-body');
        const badge = document.getElementById('global-notif-badge');

        if(!body || !badge) return;

        if(misRequisicionesPendientes.length === 0) {
            body.innerHTML = `<p style="text-align:center; color: var(--text-muted); padding: 15px;">No hay notificaciones pendientes ni alertas nuevas.</p>`;
            badge.style.display = 'none';
            return;
        }

        badge.innerText = misRequisicionesPendientes.length;
        badge.style.display = 'inline-block';

        body.innerHTML = misRequisicionesPendientes.map(c => `
            <div style="padding: 12px 14px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-main); box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                    <strong style="font-size: 14px; color: var(--text-main);">${c.descripcion}</strong>
                    <span class="badge" style="background: var(--warning); color: #fff; font-size: 10.5px; padding: 2px 6px;">${c.estado || c.estatus}</span>
                </div>
                <div style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 4px;">Justificación: ${c.justificacion || 'N/A'}</div>
                <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 4px; margin-top: 4px;">
                    <span>Presupuesto: <strong>$${parseFloat(c.presupuesto || 0).toFixed(2)}</strong></span>
                    <span>Depto: <strong>${c.departamento || 'General'}</strong></span>
                </div>
            </div>
        `).join('');
    } catch(e) {
        console.error("Error al sincronizar notificaciones", e);
    }
}

async function loadBCVTicker() {
    try { 
        const resUSD = await fetch('https://ve.dolarapi.com/v1/dolares/oficial'); 
        const resEUR = await fetch('https://ve.dolarapi.com/v1/euros/oficial'); 
        const dUSD = await resUSD.json();
        const dEUR = await resEUR.json();
        
        document.querySelectorAll('#tasa-bcv-text').forEach(el => {
            el.innerHTML = `USD: Bs. ${dUSD.promedio.toFixed(2)}<br>EUR: Bs. ${dEUR.promedio.toFixed(2)}`;
        });
    } catch(e) { 
        document.querySelectorAll('#tasa-bcv-text').forEach(el => {
            el.innerHTML = `USD: Bs. 848.55<br>EUR: Bs. 974.42`;
        });
    }
}

function initTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    actualizarIconoTemaUI();
}

window.toggleTheme = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    actualizarIconoTemaUI();
}

function actualizarIconoTemaUI() {
    const iconEl = document.getElementById('theme-icon-indicator');
    if (iconEl) {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        iconEl.innerText = currentTheme === 'dark' ? 'light_mode' : 'dark_mode';
    }
    const loginIconEl = document.getElementById('icon-theme-login');
    if (loginIconEl) {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        loginIconEl.innerText = currentTheme === 'dark' ? 'light_mode' : 'dark_mode';
    }
}

window.mostrarNotificacion = function(mensaje, tipo = 'success') {
    let container = document.querySelector('.sgbn-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'sgbn-toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const icono = tipo === 'success' ? 'check_circle' : tipo === 'error' ? 'error' : 'warning';
    toast.className = `sgbn-toast ${tipo}`;
    toast.innerHTML = `<span class="material-icons">${icono}</span> <span>${mensaje}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3500);
}

window.login = async function() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    if(!username || !password) return window.mostrarNotificacion("Ingrese usuario y contraseña.", "warning");

    try {
        const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        const data = await res.json();
        if(res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('nombre', data.nombre);
            localStorage.setItem('departamento', data.departamento);
            window.location.reload();
        } else { window.mostrarNotificacion(data.error || "Credenciales inválidas.", "error"); }
    } catch(e) { window.mostrarNotificacion("Error de conexión.", "error"); }
}

window.logout = async function() { 
    try { await fetch('/api/logout', { method: 'POST', headers: authHeaders() }); } catch(e){}
    localStorage.clear(); window.location.href = '/index.html'; 
}

window.navegarA = function(seccion) { window.location.href = seccion === 'resumen' ? '/index.html' : `/${seccion}`; }