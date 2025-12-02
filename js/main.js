// sistema_voluntariado/js/main.js - VERSIÓN CORREGIDA

// ============================================
// DECLARACIÓN SEGURA DE VARIABLES GLOBALES
// ============================================

// Verificar si las variables ya fueron declaradas en data.js
// Si no existen, crearlas aquí
if (typeof window.currentUser === 'undefined') {
    window.currentUser = null;
}
if (typeof window.currentMonth === 'undefined') {
    window.currentMonth = new Date().getMonth();
}
if (typeof window.currentYear === 'undefined') {
    window.currentYear = new Date().getFullYear();
}
if (typeof window.campanias === 'undefined') {
    window.campanias = [];
}
if (typeof window.postulaciones === 'undefined') {
    window.postulaciones = [];
}
if (typeof window.tareas === 'undefined') {
    window.tareas = [];
}
if (typeof window.logros === 'undefined') {
    window.logros = [];
}
if (typeof window.ratings === 'undefined') {
    window.ratings = [];
}
if (typeof window.mensajes === 'undefined') {
    window.mensajes = [];
}
if (typeof window.notificaciones === 'undefined') {
    window.notificaciones = [];
}


// ============================================
// INICIALIZACIÓN
// ============================================

console.log('🚀 Sistema de Gestión de Voluntariado - Iniciando...');
console.log('📁 Carpeta: sistema_voluntariado');
console.log('🌐 URL:', window.location.href);

document.addEventListener('DOMContentLoaded', async function() {
    console.log('✅ DOM cargado');
    
    try {
        // 1. Configurar UI básica
        configurarTabsLogin();
        configurarEventListeners();
        
        if (typeof setupNavigation === 'function') {
            setupNavigation();
        }
        
        if (typeof inicializarBusqueda === 'function') {
            inicializarBusqueda();
        }
        
        // 2. Verificar conexión a API
        console.log('🔌 Probando conexión API...');
        const conexionActiva = await verificarConexionAPI();
        
        // 3. Verificar usuario logueado
        await verificarUsuarioLogueado(conexionActiva);
        
        // 4. Inicializar sincronización periódica
        inicializarSincronizacion();
        
        console.log('✅ Sistema inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
        mostrarErrorInicializacion(error);
    }
});

function configurarTabsLogin() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(this.dataset.tab + '-form').classList.add('active');
        });
    });
}

function configurarEventListeners() {
    // Botones principales
    const elementos = {
        'login-btn': login,
        'register-btn': register,
        'create-campaign-submit': createCampaign,
        'cancel-create-campaign': () => showHomePage(),
        'view-calendar-btn': showCalendarPage,
        'back-from-applications': () => showHomePage(),
        'back-from-calendar': () => showHomePage(),
        'save-profile-btn': saveProfile,
        'cancel-edit-profile': () => showProfilePage()
    };
    
    Object.entries(elementos).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', handler);
        }
    });
    
    // Botones del calendario
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => {
        if (typeof changeMonth === 'function') changeMonth(-1);
    });
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => {
        if (typeof changeMonth === 'function') changeMonth(1);
    });
}

async function verificarConexionAPI() {
    try {
        console.log('🔌 Verificando conexión a la API...');
        
        // Usar timeout con AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('api/init.php?action=ping', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const text = await response.text();
            
            // Verificar que sea JSON válido
            try {
                const data = JSON.parse(text);
                console.log('✅ Conexión a API establecida:', data.message || 'OK');
                
                // Verificar si hay sincronización pendiente
                await verificarSincronizacionPendiente();
                
                return true;
            } catch (jsonError) {
                console.error('❌ API no devolvió JSON válido:', jsonError.message);
                console.log('Respuesta recibida:', text.substring(0, 200));
                return false;
            }
        } else {
            console.warn('⚠️ API responde pero con error:', response.status);
            return false;
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('❌ Timeout conectando a la API (5 segundos)');
        } else {
            console.error('❌ Error conectando a la API:', error.message);
        }
        
        mostrarAlertaConexion();
        return false;
    }
}

function mostrarAlertaConexion() {
    if (document.querySelector('.connection-alert')) return;
    
    const alerta = document.createElement('div');
    alerta.className = 'connection-alert';
    alerta.innerHTML = `
        <div class="alert-content">
            <strong>⚠️ Modo sin conexión</strong>
            <p>No se pudo conectar al servidor. Trabajando con datos locales.</p>
            <div class="alert-actions">
                <button onclick="reintentarConexion()" class="btn btn-retry">Reintentar</button>
                <button onclick="ocultarAlerta()" class="btn btn-close">Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.prepend(alerta);
    
    // Añadir estilos si no existen
    if (!document.querySelector('#connection-alert-styles')) {
        const styles = document.createElement('style');
        styles.id = 'connection-alert-styles';
        styles.textContent = `
            .connection-alert {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                animation: slideInRight 0.3s ease-out;
            }
            .connection-alert .alert-content {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                max-width: 300px;
            }
            .connection-alert .alert-actions {
                margin-top: 10px;
                display: flex;
                gap: 10px;
            }
            .connection-alert .btn-retry {
                padding: 6px 12px;
                background: #17a2b8;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            .connection-alert .btn-close {
                padding: 6px 12px;
                background: #6c757d;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
}

async function verificarSincronizacionPendiente() {
    const pendientes = localStorage.getItem('sgv_pending_sync');
    if (pendientes) {
        try {
            const operaciones = JSON.parse(pendientes);
            if (operaciones.length > 0) {
                console.log(`🔄 Hay ${operaciones.length} operaciones pendientes`);
            }
        } catch (error) {
            console.error('Error verificando sincronización:', error);
        }
    }
}

async function verificarUsuarioLogueado(conexionActiva) {
    const savedUser = localStorage.getItem('sgv_currentUser');
    
    if (savedUser) {
        try {
            // Actualizar la variable global
            window.currentUser = JSON.parse(savedUser);
            
            // Actualizar referencia local
            const currentUser = window.currentUser;
            
            console.log('👤 Usuario recuperado:', currentUser.nombre);
            
            // Cargar datos según conexión
            if (conexionActiva) {
                await cargarTodosLosDatosDesdeAPI();
            } else {
                cargarTodosLosDatosDesdeCache();
            }
            
            // Actualizar navegación y mostrar página principal
            if (typeof updateNavigation === 'function') {
                updateNavigation();
            }
            if (typeof showHomePage === 'function') {
                showHomePage();
            }
            
        } catch (error) {
            console.error('Error recuperando usuario:', error);
            if (typeof showLoginPage === 'function') {
                showLoginPage();
            }
        }
    } else {
        if (typeof showLoginPage === 'function') {
            showLoginPage();
        }
    }
}

async function cargarTodosLosDatosDesdeAPI() {
    console.log('🔄 Cargando datos desde API...');
    
    try {
        // Verificar que api existe
        if (typeof api === 'undefined') {
            console.error('❌ API Service no está definido');
            throw new Error('API Service no disponible');
        }
        
        // Cargar campañas activas
        if (typeof cargarCampaniasDesdeAPI === 'function') {
            await cargarCampaniasDesdeAPI();
        }
        
        // Cargar datos del usuario si existe
        if (window.currentUser) {
            const userId = window.currentUser.id;
            
            // Cargar en paralelo si las funciones existen
            const promises = [];
            
            if (typeof cargarPostulacionesUsuario === 'function') {
                promises.push(cargarPostulacionesUsuario(userId));
            }
            
            if (window.currentUser.rol === 'voluntario' && typeof cargarTareasUsuario === 'function') {
                promises.push(cargarTareasUsuario(userId));
            }
            
            if (typeof cargarLogrosUsuario === 'function') {
                promises.push(cargarLogrosUsuario(userId));
            }
            
            await Promise.allSettled(promises);
        }
        
        console.log('✅ Datos cargados desde API');
        actualizarCacheLocal();
        
    } catch (error) {
        console.error('❌ Error cargando datos desde API:', error);
        console.log('🔄 Fallback a datos locales...');
        cargarTodosLosDatosDesdeCache();
    }
}

async function cargarCampaniasDesdeAPI() {
    try {
        // Usar api si existe, sino fetch directo
        let response;
        
        if (typeof api !== 'undefined' && api.getCampaigns) {
            response = await api.getCampaigns({ estado: 'activa' });
        } else {
            // Fallback a fetch directo
            const fetchResponse = await fetch('api/campaigns.php?action=getAll&estado=activa');
            const text = await fetchResponse.text();
            
            try {
                const data = JSON.parse(text);
                response = {
                    success: fetchResponse.ok,
                    data: data.data || data,
                    message: data.message || ''
                };
            } catch (e) {
                throw new Error('Respuesta no es JSON: ' + text.substring(0, 100));
            }
        }
        
        if (response.success) {
            window.campanias = response.data.map(campania => ({
                ...campania,
                fecha: campania.fecha ? campania.fecha.split('T')[0] : ''
            }));
            
            // Actualizar referencia local
            campanias = window.campanias;
            
            console.log(`📊 ${campanias.length} campañas cargadas`);
            return true;
        } else {
            throw new Error(response.message || 'Error en API');
        }
    } catch (error) {
        console.error('Error cargando campañas:', error.message);
        throw error;
    }
}

function cargarTodosLosDatosDesdeCache() {
    console.log('💾 Cargando datos desde caché...');
    
    // Helper para cargar datos de localStorage
    const cargarDatos = (clave, valorPorDefecto = []) => {
        try {
            const datos = localStorage.getItem(clave);
            return datos ? JSON.parse(datos) : valorPorDefecto;
        } catch (e) {
            console.error(`Error cargando ${clave}:`, e);
            return valorPorDefecto;
        }
    };
    
    // Actualizar variables globales primero
    window.campanias = cargarDatos('sgv_campanias_cache', []);
    window.postulaciones = cargarDatos('sgv_postulaciones_cache', []);
    window.tareas = cargarDatos('sgv_tareas_cache', []);
    window.logros = cargarDatos('sgv_logros_cache', []);
    window.ratings = cargarDatos('sgv_ratings_cache', []);
    
    // Actualizar referencias locales
    campanias = window.campanias;
    postulaciones = window.postulaciones;
    tareas = window.tareas;
    logros = window.logros;
    ratings = window.ratings;
    
    console.log(`📊 Datos en caché: ${campanias.length} campañas`);
}

function actualizarCacheLocal() {
    // Guardar solo si hay datos
    const guardarSiHayDatos = (clave, datos) => {
        if (datos && datos.length > 0) {
            localStorage.setItem(clave, JSON.stringify(datos));
        }
    };
    
    guardarSiHayDatos('sgv_campanias_cache', window.campanias);
    guardarSiHayDatos('sgv_postulaciones_cache', window.postulaciones);
    guardarSiHayDatos('sgv_tareas_cache', window.tareas);
    guardarSiHayDatos('sgv_logros_cache', window.logros);
    guardarSiHayDatos('sgv_ratings_cache', window.ratings);
    
    // Marcar timestamp
    localStorage.setItem('sgv_last_cache_update', Date.now().toString());
    
    console.log('💾 Caché actualizado');
}

function inicializarSincronizacion() {
    // Sincronizar periódicamente si hay conexión
    setInterval(async () => {
        if (navigator.onLine) {
            await sincronizarDatosOffline();
        }
    }, 30000);
    
    // Escuchar eventos de conexión
    window.addEventListener('online', manejarConexionRestablecida);
    window.addEventListener('offline', manejarConexionPerdida);
}

async function sincronizarDatosOffline() {
    const datosPendientes = localStorage.getItem('sgv_pending_sync');
    if (!datosPendientes) return;
    
    try {
        const operaciones = JSON.parse(datosPendientes);
        console.log(`🔄 Sincronizando ${operaciones.length} operaciones...`);
        
        // Filtrar operaciones antiguas (> 24 horas)
        const ahora = Date.now();
        const operacionesActuales = operaciones.filter(op => {
            const edad = ahora - (op.timestamp || 0);
            return edad < 24 * 60 * 60 * 1000; // 24 horas
        });
        
        if (operacionesActuales.length === 0) {
            localStorage.removeItem('sgv_pending_sync');
            return;
        }
        
        // Intentar sincronizar
        const exitosas = [];
        const fallidas = [];
        
        for (const operacion of operacionesActuales) {
            try {
                // Esta función debería estar en otro archivo
                if (typeof ejecutarOperacionPendiente === 'function') {
                    await ejecutarOperacionPendiente(operacion);
                    exitosas.push(operacion);
                }
            } catch (error) {
                console.error('Error sincronizando operación:', error);
                fallidas.push(operacion);
            }
        }
        
        // Actualizar lista de pendientes
        if (fallidas.length > 0) {
            localStorage.setItem('sgv_pending_sync', JSON.stringify(fallidas));
        } else {
            localStorage.removeItem('sgv_pending_sync');
        }
        
        console.log(`✅ ${exitosas.length} operaciones sincronizadas`);
        
    } catch (error) {
        console.error('Error en sincronización:', error);
    }
}

function manejarConexionRestablecida() {
    console.log('🌐 Conexión restablecida');
    mostrarNotificacionTemporal('Conexión restablecida', 'success');
    
    // Verificar API después de un momento
    setTimeout(async () => {
        const conexionActiva = await verificarConexionAPI();
        if (conexionActiva && window.currentUser) {
            await cargarTodosLosDatosDesdeAPI();
        }
    }, 2000);
}

function manejarConexionPerdida() {
    console.log('📵 Conexión perdida');
    mostrarNotificacionTemporal('Modo offline', 'warning');
}

function mostrarNotificacionTemporal(mensaje, tipo = 'info') {
    const notificacion = document.createElement('div');
    notificacion.className = `notification notification-${tipo}`;
    notificacion.textContent = mensaje;
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 9998;
        animation: slideInRight 0.3s ease-out;
        background-color: ${tipo === 'success' ? '#28a745' : 
                          tipo === 'warning' ? '#ffc107' : 
                          tipo === 'error' ? '#dc3545' : '#17a2b8'};
    `;
    
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

function mostrarErrorInicializacion(error) {
    const container = document.getElementById('login-page') || document.body;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-inicializacion';
    errorDiv.innerHTML = `
        <div style="background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; 
                    padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">⚠️ Error de Inicialización</h3>
            <p><strong>${error.message || 'Error desconocido'}</strong></p>
            <p>El sistema puede funcionar en modo limitado.</p>
            <button onclick="location.reload()" 
                    style="margin-top: 10px; padding: 8px 16px; background: #dc3545; 
                           color: white; border: none; border-radius: 4px; cursor: pointer;">
                Recargar Página
            </button>
        </div>
    `;
    
    container.insertBefore(errorDiv, container.firstChild);
}

// ============================================
// FUNCIONES GLOBALES AUXILIARES
// ============================================

window.reintentarConexion = async function() {
    const alerta = document.querySelector('.connection-alert');
    if (alerta) {
        alerta.innerHTML = '<div class="alert-content">Reintentando conexión...</div>';
    }
    
    const conexionActiva = await verificarConexionAPI();
    
    if (conexionActiva) {
        if (alerta) alerta.remove();
        mostrarNotificacionTemporal('Conexión restablecida', 'success');
        
        if (window.currentUser) {
            await cargarTodosLosDatosDesdeAPI();
        }
    }
};

window.ocultarAlerta = function() {
    const alerta = document.querySelector('.connection-alert');
    if (alerta) {
        alerta.remove();
    }
};

// ============================================
// INICIALIZAR API SERVICE SI NO EXISTE
// ============================================

if (typeof api === 'undefined') {
    console.log('🔧 Inicializando API Service básico...');
    
    window.api = {
        request: async function(endpoint, method = 'GET', data = null) {
            console.log(`🌐 API Call: ${method} ${endpoint}`);
            
            try {
                const response = await fetch('api/' + endpoint, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': localStorage.getItem('sgv_token') ? 
                            `Bearer ${localStorage.getItem('sgv_token')}` : ''
                    },
                    body: data ? JSON.stringify(data) : null
                });
                
                const text = await response.text();
                
                try {
                    const json = JSON.parse(text);
                    return {
                        success: response.ok,
                        status: response.status,
                        data: json.data || json,
                        message: json.message || ''
                    };
                } catch (e) {
                    console.error('❌ Respuesta no es JSON:', text.substring(0, 200));
                    return {
                        success: false,
                        status: response.status,
                        data: null,
                        message: 'Error en respuesta del servidor'
                    };
                }
                
            } catch (error) {
                console.error('❌ Error en API request:', error.message);
                return {
                    success: false,
                    status: 0,
                    data: null,
                    message: 'Error de conexión',
                    offline: true
                };
            }
        },
        
        getCampaigns: async function(params = {}) {
            const query = new URLSearchParams(params).toString();
            return await this.request(`campaigns.php?action=getAll&${query}`);
        }
    };
}

// ============================================
// AÑADIR ANIMACIONES CSS
// ============================================

if (!document.querySelector('#animations-styles')) {
    const style = document.createElement('style');
    style.id = 'animations-styles';
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

console.log('🎯 main.js cargado y listo');