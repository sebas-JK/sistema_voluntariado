// sistema_voluntariado/js/geolocation.js - MODIFICADO PARA MYSQL
// NOTA: Este archivo se mantiene casi igual ya que funciona principalmente en el cliente

// =============================================
// SISTEMA DE GEOLOCALIZACIÓN - INTERFAZ DE USUARIO
// =============================================

let mapa = null;
let marcadores = [];
let ubicacionUsuario = null;

// Base de datos de coordenadas de ciudades (simulada) - se mantiene igual
const coordenadasCiudades = {
    "Buenos Aires": { lat: -34.6037, lng: -58.3816 },
    "Córdoba": { lat: -31.4201, lng: -64.1888 },
    "Rosario": { lat: -32.9468, lng: -60.6393 },
    "Mendoza": { lat: -32.8895, lng: -68.8458 },
    "La Plata": { lat: -34.9205, lng: -57.9536 },
    "Mar del Plata": { lat: -38.0055, lng: -57.5426 },
    "Salta": { lat: -24.7829, lng: -65.4122 },
    "San Juan": { lat: -31.5375, lng: -68.5364 },
    "San Luis": { lat: -33.3017, lng: -66.3378 },
    "Neuquén": { lat: -38.9516, lng: -68.0591 }
};

async function mostrarMapaCampanias() {
    const container = document.getElementById('home-page') || document.getElementById('campaigns-page');
    if (!container) return;
    
    container.innerHTML = `
        <div class="geolocation-container">
            <div class="map-header">
                <h2>🗺️ Campañas Cercanas</h2>
                <p>Encuentra oportunidades de voluntariado cerca de ti</p>
                <div class="location-controls">
                    <button class="btn btn-primary" onclick="obtenerYMostrarUbicacion()">
                        📍 Usar mi ubicación actual
                    </button>
                    <div class="location-search">
                        <input type="text" id="location-search" placeholder="Buscar por ciudad..." 
                               onkeyup="buscarPorUbicacion(this.value)">
                        <button class="btn btn-secondary" onclick="buscarPorUbicacion(document.getElementById('location-search').value)">
                            🔍 Buscar
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="map-layout">
                <!-- Panel de controles -->
                <div class="map-controls">
                    <div class="filter-section">
                        <h3>Filtros</h3>
                        <div class="filter-group">
                            <label>Radio de búsqueda:</label>
                            <select id="search-radius" onchange="filtrarPorRadio()">
                                <option value="10">10 km</option>
                                <option value="25" selected>25 km</option>
                                <option value="50">50 km</option>
                                <option value="100">100 km</option>
                                <option value="0">Sin límite</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label>Mostrar:</label>
                            <div class="checkbox-group">
                                <label>
                                    <input type="checkbox" id="filter-active" checked onchange="filtrarCampanias()">
                                    Campañas activas
                                </label>
                                <label>
                                    <input type="checkbox" id="filter-within-radius" checked onchange="filtrarCampanias()">
                                    Solo en radio
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="campaigns-list" id="campaigns-map-list">
                        <h3>Campañas Cercanas</h3>
                        <div class="loading-locations">Cargando ubicaciones...</div>
                    </div>
                </div>
                
                <!-- Mapa -->
                <div class="map-container">
                    <div id="campaigns-map"></div>
                    <div class="map-legend">
                        <div class="legend-item">
                            <span class="legend-marker user-marker"></span>
                            <span>Tu ubicación</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-marker campaign-marker"></span>
                            <span>Campaña</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-distance near"></span>
                            <span>≤ 10 km</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-distance medium"></span>
                            <span>10-25 km</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-distance far"></span>
                            <span>> 25 km</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Inicializar el mapa después de un breve retraso
    setTimeout(() => {
        inicializarMapa();
        obtenerYMostrarUbicacion();
    }, 100);
}

function inicializarMapa() {
    // Verificar si Leaflet está cargado
    if (typeof L === 'undefined') {
        console.error('Leaflet no está cargado');
        cargarLeaflet();
        return;
    }
    
    // Inicializar el mapa centrado en Argentina
    mapa = L.map('campaigns-map').setView([-34.6037, -58.3816], 5);
    
    // Agregar capa de tiles de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(mapa);
    
    console.log('✅ Mapa inicializado correctamente');
}

function cargarLeaflet() {
    // Cargar Leaflet CSS y JS dinámicamente
    if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css';
        document.head.appendChild(link);
    }
    
    if (!document.querySelector('script[src*="leaflet"]')) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js';
        script.onload = () => {
            console.log('✅ Leaflet cargado dinámicamente');
            inicializarMapa();
        };
        document.head.appendChild(script);
    }
}

async function obtenerYMostrarUbicacion() {
    try {
        const btn = document.querySelector('.location-controls .btn-primary');
        const textoOriginal = btn.textContent;
        btn.textContent = '📍 Obteniendo ubicación...';
        btn.disabled = true;
        
        ubicacionUsuario = await obtenerUbicacionUsuario();
        
        btn.textContent = textoOriginal;
        btn.disabled = false;
        
        // Cargar campañas desde MySQL para mostrar en el mapa
        await cargarCampaniasParaMapa();
        
        // Centrar mapa en la ubicación del usuario
        if (mapa && ubicacionUsuario) {
            mapa.setView([ubicacionUsuario.lat, ubicacionUsuario.lng], 10);
            
            // Agregar marcador de usuario
            agregarMarcadorUsuario();
        }
        
    } catch (error) {
        console.error('Error obteniendo ubicación:', error);
        alert('No se pudo obtener tu ubicación. Usando ubicación por defecto.');
        
        // Usar ubicación por defecto
        ubicacionUsuario = { lat: -34.6037, lng: -58.3816, porDefecto: true };
        await cargarCampaniasParaMapa();
    }
}

async function cargarCampaniasParaMapa() {
    try {
        // Cargar campañas activas desde la API
        const response = await fetch(`${API_BASE}/campaigns.php?action=get_active`);
        const campaniasActivas = await response.json();
        
        // Actualizar array global
        campanias = campaniasActivas;
        
        // Mostrar campañas cercanas
        await mostrarCampaniasCercanas();
        
    } catch (error) {
        console.error('Error cargando campañas para mapa:', error);
        // Usar campañas ya cargadas en memoria
        mostrarCampaniasCercanas();
    }
}

function agregarMarcadorUsuario() {
    if (!mapa || !ubicacionUsuario) return;
    
    // Remover marcador anterior si existe
    const marcadorExistente = marcadores.find(m => m._userLocation);
    if (marcadorExistente) {
        mapa.removeLayer(marcadorExistente);
    }
    
    const marcadorUsuario = L.marker([ubicacionUsuario.lat, ubicacionUsuario.lng])
        .addTo(mapa)
        .bindPopup(`
            <div class="user-popup">
                <strong>📍 Tu ubicación</strong>
                ${ubicacionUsuario.porDefecto ? '<br><small>(Ubicación por defecto)</small>' : ''}
            </div>
        `);
    
    marcadorUsuario._userLocation = true;
    marcadores.push(marcadorUsuario);
}

async function mostrarCampaniasCercanas() {
    if (!ubicacionUsuario) {
        await obtenerYMostrarUbicacion();
        return;
    }
    
    const radio = parseInt(document.getElementById('search-radius')?.value || '25');
    const campaniasCercanas = obtenerCampaniasCercanas(
        ubicacionUsuario.lat, 
        ubicacionUsuario.lng, 
        radio === 0 ? null : radio
    );
    
    actualizarListaCampanias(campaniasCercanas);
    actualizarMapaCampanias(campaniasCercanas);
}

function obtenerCampaniasCercanas(lat, lng, radioKm = 50) {
    const campaniasConDistancia = campanias
        .filter(c => c.estado === 'activa')
        .map(campania => {
            const coords = obtenerCoordenadas(campania.ubicacion);
            const distancia = calcularDistancia(lat, lng, coords.lat, coords.lng);
            
            return {
                ...campania,
                coordenadas: coords,
                distancia: distancia,
                enRadio: radioKm === null || distancia <= radioKm
            };
        })
        .sort((a, b) => a.distancia - b.distancia);
    
    return campaniasConDistancia;
}

function obtenerCoordenadas(ubicacion) {
    // Buscar en la base de datos de ciudades
    for (const [ciudad, coords] of Object.entries(coordenadasCiudades)) {
        if (ubicacion.toLowerCase().includes(ciudad.toLowerCase())) {
            return coords;
        }
    }
    
    // Si no se encuentra, generar coordenadas aleatorias en Argentina
    return {
        lat: -34 + (Math.random() * 10 - 5), // Entre -39 y -29
        lng: -64 + (Math.random() * 10 - 5)  // Entre -69 y -59
    };
}

function calcularDistancia(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distancia = R * c;
    
    return Math.round(distancia * 100) / 100; // Redondear a 2 decimales
}

function actualizarListaCampanias(campaniasCercanas) {
    const container = document.getElementById('campaigns-map-list');
    if (!container) return;
    
    if (campaniasCercanas.length === 0) {
        container.innerHTML = `
            <h3>Campañas Cercanas</h3>
            <div class="no-campaigns">
                <p>No se encontraron campañas en el área seleccionada</p>
                <p>Intenta aumentar el radio de búsqueda</p>
            </div>
        `;
        return;
    }
    
    const filtroActivas = document.getElementById('filter-active')?.checked !== false;
    const filtroEnRadio = document.getElementById('filter-within-radius')?.checked;
    
    const campaniasFiltradas = campaniasCercanas.filter(campania => {
        if (filtroActivas && campania.estado !== 'activa') return false;
        if (filtroEnRadio && !campania.enRadio) return false;
        return true;
    });
    
    container.innerHTML = `
        <h3>Campañas Cercanas (${campaniasFiltradas.length})</h3>
        <div class="campaigns-map-list">
            ${campaniasFiltradas.map(campania => `
                <div class="campaign-map-item" onclick="centrarEnCampania(${campania.coordenadas.lat}, ${campania.coordenadas.lng})">
                    <div class="campaign-map-header">
                        <h4>${campania.titulo}</h4>
                        <span class="distance-badge ${obtenerClaseDistancia(campania.distancia)}">
                            ${formatearDistancia(campania.distancia)}
                        </span>
                    </div>
                    <p class="campaign-org">${campania.organizacion_nombre}</p>
                    <p class="campaign-location">📍 ${campania.ubicacion}</p>
                    <div class="campaign-map-details">
                        <span>👥 ${campania.voluntarios_actuales}/${campania.max_voluntarios}</span>
                        <span>📅 ${formatearFecha(campania.fecha)}</span>
                    </div>
                    <button class="btn btn-small" onclick="event.stopPropagation(); aplicarACampania(${campania.id})">
                        Postularme
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

function actualizarMapaCampanias(campaniasCercanas) {
    if (!mapa) return;
    
    // Limpiar marcadores anteriores (excepto el del usuario)
    marcadores.forEach(marcador => {
        if (!marcador._userLocation) {
            mapa.removeLayer(marcador);
        }
    });
    marcadores = marcadores.filter(m => m._userLocation);
    
    // Agregar nuevos marcadores
    campaniasCercanas.forEach(campania => {
        const marcador = L.marker([campania.coordenadas.lat, campania.coordenadas.lng])
            .addTo(mapa)
            .bindPopup(`
                <div class="campaign-popup">
                    <h4>${campania.titulo}</h4>
                    <p><strong>Organización:</strong> ${campania.organizacion_nombre}</p>
                    <p><strong>Ubicación:</strong> ${campania.ubicacion}</p>
                    <p><strong>Distancia:</strong> ${formatearDistancia(campania.distancia)}</p>
                    <p><strong>Voluntarios:</strong> ${campania.voluntarios_actuales}/${campania.max_voluntarios}</p>
                    <p><strong>Fecha:</strong> ${formatearFecha(campania.fecha)}</p>
                    <button class="btn btn-small" onclick="aplicarACampania(${campania.id})">
                        Postularme
                    </button>
                </div>
            `);
        
        // Personalizar icono según distancia
        const icono = L.divIcon({
            className: `campaign-marker ${obtenerClaseDistancia(campania.distancia)}`,
            html: '📍',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });
        
        marcador.setIcon(icono);
        marcadores.push(marcador);
    });
}

function obtenerClaseDistancia(distancia) {
    if (distancia <= 10) return 'near';
    if (distancia <= 25) return 'medium';
    return 'far';
}

function centrarEnCampania(lat, lng) {
    if (mapa) {
        mapa.setView([lat, lng], 13);
    }
}

function buscarPorUbicacion(ciudad) {
    if (!ciudad.trim()) {
        obtenerYMostrarUbicacion();
        return;
    }
    
    // Buscar coordenadas de la ciudad
    const coords = obtenerCoordenadas(ciudad);
    if (coords) {
        ubicacionUsuario = { ...coords, porDefecto: true };
        
        if (mapa) {
            mapa.setView([coords.lat, coords.lng], 10);
            agregarMarcadorUsuario();
            mostrarCampaniasCercanas();
        }
    } else {
        alert('No se pudo encontrar la ciudad especificada');
    }
}

function filtrarPorRadio() {
    mostrarCampaniasCercanas();
}

function filtrarCampanias() {
    if (ubicacionUsuario) {
        const radio = parseInt(document.getElementById('search-radius')?.value || '25');
        const campaniasCercanas = obtenerCampaniasCercanas(
            ubicacionUsuario.lat, 
            ubicacionUsuario.lng, 
            radio === 0 ? null : radio
        );
        actualizarListaCampanias(campaniasCercanas);
    }
}

function formatearDistancia(distanciaKm) {
    if (distanciaKm < 1) {
        return `${Math.round(distanciaKm * 1000)} m`;
    } else {
        return `${distanciaKm} km`;
    }
}

function obtenerUbicacionUsuario() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('La geolocalización no es soportada por este navegador'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    precision: position.coords.accuracy
                });
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    });
}

// Integración con la navegación existente
function mostrarMapaPage() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('home-page').classList.add('active');
    mostrarMapaCampanias();
}