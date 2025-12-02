// sistema_voluntariado/js/data.js - VERSIÓN COMPLETA CORREGIDA

// ============================================
// DECLARACIÓN SEGURA DE VARIABLES GLOBALES
// ============================================

// Verificar y crear variables globales si no existen
const globalVars = {
    'usuarios': () => JSON.parse(localStorage.getItem('sgv_usuarios')) || [],
    'campanias': () => JSON.parse(localStorage.getItem('sgv_campanias')) || [],
    'postulaciones': () => JSON.parse(localStorage.getItem('sgv_postulaciones')) || [],
    'tareas': () => JSON.parse(localStorage.getItem('sgv_tareas')) || [],
    'logros': () => JSON.parse(localStorage.getItem('sgv_logros')) || [],
    'notificaciones': () => JSON.parse(localStorage.getItem('sgv_notificaciones')) || [],
    'ratings': () => JSON.parse(localStorage.getItem('sgv_ratings')) || [],
    'mensajes': () => JSON.parse(localStorage.getItem('sgv_mensajes')) || []
};

Object.entries(globalVars).forEach(([varName, initFunc]) => {
    if (typeof window[varName] === 'undefined') {
        window[varName] = initFunc();
    }
});

// Crear referencias locales (no son nuevas declaraciones, solo alias)
let usuarios = window.usuarios;
let campanias = window.campanias;
let postulaciones = window.postulaciones;
let tareas = window.tareas;
let logros = window.logros;
let notificaciones = window.notificaciones;
let ratings = window.ratings;
let mensajes = window.mensajes;

// currentUser ya debería estar definido en main.js
let currentUser = window.currentUser || null;

// ============================================
// FUNCIÓN PRINCIPAL DE CARGA DE DATOS
// ============================================

async function cargarTodosLosDatos() {
    console.log('🔄 Cargando datos desde MySQL...');
    
    try {
        // Verificar que las variables existan
        if (typeof usuarios === 'undefined') {
            console.error('❌ usuarios no está definido');
            throw new Error('Variable usuarios no inicializada');
        }
        
        // Intentar cargar desde API si está disponible
        const apiDisponible = await verificarAPI();
        
        if (apiDisponible) {
            console.log('✅ API disponible, cargando datos remotos...');
            await cargarDatosDesdeAPI();
        } else {
            console.log('⚠️ API no disponible, usando datos locales');
            cargarDatosDesdeLocalStorage();
        }
        
        console.log(`✅ Datos cargados: ${campanias.length} campañas, ${usuarios.length} usuarios`);
        return true;
        
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        console.log('🔄 Usando datos de respaldo (vacíos)...');
        cargarDatosDeRespaldo();
        return false;
    }
}

async function verificarAPI() {
    try {
        const response = await fetch('api/init.php?action=ping', {
            timeout: 3000
        });
        
        if (!response.ok) return false;
        
        const text = await response.text();
        try {
            const data = JSON.parse(text);
            return data.success === true;
        } catch {
            return false;
        }
    } catch {
        return false;
    }
}

async function cargarDatosDesdeAPI() {
    console.log('📡 Cargando datos desde API...');
    
    try {
        // Verificar endpoints existentes
        const endpoints = [
            { url: 'api/auth.php?action=getAll', key: 'usuarios' },
            { url: 'api/campaigns.php?action=getAll&estado=activa', key: 'campanias' }
        ];
        
        for (const endpoint of endpoints) {
            try {
                console.log(`🔍 Probando: ${endpoint.url}`);
                const response = await fetch(endpoint.url, {
                    timeout: 5000
                });
                
                if (!response.ok) {
                    console.warn(`⚠️ ${endpoint.url} respondió con: ${response.status}`);
                    continue;
                }
                
                const text = await response.text();
                console.log(`📥 Respuesta ${endpoint.key}:`, text.substring(0, 100));
                
                if (!text || text.trim() === '') {
                    console.warn(`⚠️ ${endpoint.key}: Respuesta vacía`);
                    continue;
                }
                
                try {
                    const data = JSON.parse(text);
                    
                    if (data.success && data.data) {
                        window[endpoint.key] = data.data;
                        console.log(`✅ ${window[endpoint.key].length} ${endpoint.key} cargados`);
                    } else {
                        console.warn(`⚠️ ${endpoint.key}: success=false o sin data`, data.message);
                    }
                } catch (jsonError) {
                    console.error(`❌ ${endpoint.key}: JSON inválido:`, jsonError.message);
                    console.log('Contenido recibido:', text);
                }
                
            } catch (fetchError) {
                console.error(`❌ Error en ${endpoint.url}:`, fetchError.message);
            }
            
            // Pequeña pausa entre requests
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Si no se cargó nada desde API, usar datos locales
        if (window.campanias.length === 0 && window.usuarios.length === 0) {
            console.log('⚠️ No se cargaron datos desde API, usando locales');
            cargarDatosDesdeLocalStorage();
        } else {
            // Actualizar localStorage como caché
            guardarDatos();
        }
        
    } catch (error) {
        console.error('Error general en cargarDatosDesdeAPI:', error);
        throw error;
    }
}

function cargarDatosDesdeLocalStorage() {
    console.log('💾 Cargando datos desde localStorage...');
    
    // Actualizar window con datos de localStorage
    window.usuarios = JSON.parse(localStorage.getItem('sgv_usuarios')) || window.usuarios || [];
    window.campanias = JSON.parse(localStorage.getItem('sgv_campanias')) || window.campanias || [];
    window.postulaciones = JSON.parse(localStorage.getItem('sgv_postulaciones')) || window.postulaciones || [];
    window.tareas = JSON.parse(localStorage.getItem('sgv_tareas')) || window.tareas || [];
    window.logros = JSON.parse(localStorage.getItem('sgv_logros')) || window.logros || [];
    
    console.log(`📁 Datos locales: ${window.campanias.length} campañas`);
}

function cargarDatosDeRespaldo() {
    console.log('🛡️ Cargando datos de respaldo...');
    
    // Datos mínimos para que el sistema funcione
    window.usuarios = window.usuarios || [];
    window.campanias = window.campanias || [];
    window.postulaciones = window.postulaciones || [];
    window.tareas = window.tareas || [];
    window.logros = window.logros || [];
    
    console.log('✅ Datos de respaldo cargados');
}

// ============================================
// FUNCIONES DE GUARDADO
// ============================================

function guardarDatos() {
    try {
        localStorage.setItem('sgv_usuarios', JSON.stringify(window.usuarios));
        localStorage.setItem('sgv_campanias', JSON.stringify(window.campanias));
        localStorage.setItem('sgv_postulaciones', JSON.stringify(window.postulaciones));
        localStorage.setItem('sgv_tareas', JSON.stringify(window.tareas));
        localStorage.setItem('sgv_logros', JSON.stringify(window.logros));
        localStorage.setItem('sgv_notificaciones', JSON.stringify(window.notificaciones));
        localStorage.setItem('sgv_ratings', JSON.stringify(window.ratings));
        localStorage.setItem('sgv_mensajes', JSON.stringify(window.mensajes));
        
        console.log('💾 Todos los datos guardados en localStorage');
    } catch (error) {
        console.error('Error guardando datos:', error);
    }
}

// ============================================
// FUNCIONES AUXILIARES (las que ya tenías)
// ============================================

function formatearFecha(fechaString) {
    if (!fechaString) return 'Fecha no disponible';
    
    try {
        const fecha = new Date(fechaString);
        const opciones = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        };
        return fecha.toLocaleDateString('es-ES', opciones);
    } catch (error) {
        return 'Fecha inválida';
    }
}

function formatearHora(fechaString) {
    if (!fechaString) return '';
    
    try {
        const fecha = new Date(fechaString);
        return fecha.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } catch (error) {
        return '';
    }
}

function getRandomColor() {
    const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        
        setTimeout(() => {
            element.innerHTML = '';
        }, 3000);
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================

console.log('🚀 Sistema de Voluntariado - Inicializando con MySQL...');

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSystem);
} else {
    initializeSystem();
}

async function initializeSystem() {
    try {
        console.log('🔧 Inicializando sistema...');
        
        // Cargar datos
        await cargarTodosLosDatos();
        
        // Verificar si hay usuario logueado
        const savedUser = localStorage.getItem('sgv_currentUser');
        if (savedUser) {
            try {
                currentUser = JSON.parse(savedUser);
                window.currentUser = currentUser;
                console.log('👤 Usuario recuperado:', currentUser.nombre);
            } catch (e) {
                console.error('Error parseando usuario:', e);
            }
        }
        
        console.log('✅ Sistema inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
    }
}

// ============================================
// EXPORTAR FUNCIONES PARA USO GLOBAL
// ============================================

// Hacer funciones disponibles globalmente
window.cargarTodosLosDatos = cargarTodosLosDatos;
window.guardarDatos = guardarDatos;
window.formatearFecha = formatearFecha;
window.formatearHora = formatearHora;
window.getRandomColor = getRandomColor;
window.showMessage = showMessage;