// sistema_voluntariado/js/campaigns.js - VERSIÓN CORREGIDA

// Configuración inicial
if (typeof window.campanias === 'undefined') window.campanias = [];
if (typeof window.postulaciones === 'undefined') window.postulaciones = [];
if (typeof window.usuarios === 'undefined') window.usuarios = [];
if (typeof window.ratings === 'undefined') window.ratings = [];

async function loadCampaigns() {
    console.log('🔵 Cargando campañas desde MySQL...');
    
    const container = document.getElementById('campaigns-container');
    if (!container) {
        console.warn('⚠️ No se encontró campaigns-container');
        return;
    }

    // Verificar que currentUser existe
    if (!currentUser) {
        container.innerHTML = '<div class="no-campaigns"><p>Por favor, inicia sesión para ver las campañas</p></div>';
        return;
    }

    // Mostrar loader
    container.innerHTML = '<div class="loading">Cargando campañas...</div>';

    // PRIMERO: Verificar si ya tenemos campañas cargadas en memoria
    const campaniasEnMemoria = window.campanias || [];
    if (campaniasEnMemoria.length > 0 && Array.isArray(campaniasEnMemoria)) {
        console.log(`✅ Usando ${campaniasEnMemoria.length} campañas ya cargadas en memoria`);
        mostrarCampaniasEnUI(campaniasEnMemoria, container);
        return;
    }

    // SEGUNDO: Si no hay en memoria, cargar desde API
    try {
        console.log('📡 Cargando campañas activas desde API...');
        const response = await fetch(`${API_BASE}campaigns.php?action=get_active`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const resultado = await response.json();
        console.log('📊 Resultado API:', resultado);
        
        // Parsear la respuesta según diferentes formatos posibles
        let campaniasActivas = [];
        
        if (Array.isArray(resultado)) {
            campaniasActivas = resultado;
        } else if (resultado.data && Array.isArray(resultado.data)) {
            campaniasActivas = resultado.data;
        } else if (resultado.success && resultado.data && Array.isArray(resultado.data)) {
            campaniasActivas = resultado.data;
        } else if (typeof resultado === 'object') {
            // Intentar extraer cualquier array del objeto
            for (const key in resultado) {
                if (Array.isArray(resultado[key])) {
                    campaniasActivas = resultado[key];
                    break;
                }
            }
        }
        
        console.log(`📊 Campañas activas obtenidas: ${campaniasActivas.length}`);
        
        if (!campaniasActivas || campaniasActivas.length === 0) {
            container.innerHTML = '<div class="no-campaigns"><p>No hay campañas disponibles en este momento.</p><p>¡Vuelve a revisar más tarde!</p></div>';
            return;
        }

        // Actualizar array global de forma segura
        window.campanias = campaniasActivas;
        
        // Si existe variable local campanias (y es mutable), actualizarla
        if (typeof campanias !== 'undefined' && Array.isArray(campanias)) {
            campanias.length = 0;
            Array.prototype.push.apply(campanias, campaniasActivas);
        }

        // Mostrar en la UI
        mostrarCampaniasEnUI(campaniasActivas, container);

    } catch (error) {
        console.error('❌ Error cargando campañas:', error);
        container.innerHTML = `
            <div class="no-campaigns">
                <p>Error al cargar las campañas.</p>
                <p>${error.message}</p>
                <button onclick="loadCampaigns()" class="btn btn-retry">Reintentar</button>
            </div>
        `;
    }
}

// Función auxiliar para mostrar campañas en la UI
function mostrarCampaniasEnUI(campaniasActivas, container) {
    console.log(`🎨 Mostrando ${campaniasActivas.length} campañas en UI`);
    
    let campaignsHTML = '';
    
    campaniasActivas.forEach(campania => {
        // Asegurar que tenemos los datos básicos
        if (!campania || !campania.id || !campania.titulo) {
            console.warn('Campaña inválida:', campania);
            return;
        }
        
        const estaPostulado = window.postulaciones.some(p => 
            p.usuario_id === currentUser.id && p.campania_id === campania.id);
        
        const puedePostularse = currentUser.rol === 'voluntario' && 
                               !estaPostulado && 
                               campania.voluntarios_actuales < campania.max_voluntarios;

        // Sistema de reputación - Mostrar rating
        const ratingHTML = mostrarRatingCampania(campania.id);

        campaignsHTML += `
            <div class="campaign-card" data-campaign-id="${campania.id}">
                <div class="campaign-image" style="background-color: ${getRandomColor()}">
                    ${campania.titulo.charAt(0)}
                </div>
                <div class="campaign-content">
                    <h3 class="campaign-title">${campania.titulo || 'Sin título'}</h3>
                    <p class="campaign-description">${campania.descripcion || 'Sin descripción'}</p>
                    
                    <!-- Sistema de reputación - Rating display -->
                    ${ratingHTML ? `
                    <div class="campaign-rating-display">
                        ${ratingHTML}
                    </div>` : ''}
                    
                    <div class="campaign-details">
                        <span><strong>Organización:</strong> ${campania.organizacion_nombre || 'No especificada'}</span>
                        <span><strong>Coordinador:</strong> ${campania.coordinador_nombre || 'No asignado'}</span>
                    </div>
                    <div class="campaign-details">
                        <span><strong>Fecha:</strong> ${formatearFecha(campania.fecha)} ${campania.hora || ''}</span>
                        <span><strong>Ubicación:</strong> ${campania.ubicacion || 'No especificada'}</span>
                    </div>
                    <div class="campaign-details">
                        <span><strong>Voluntarios:</strong> ${campania.voluntarios_actuales || 0}/${campania.max_voluntarios || 0}</span>
                        <span><strong>Estado:</strong> ${estaPostulado ? 'Ya postulado' : 'Disponible'}</span>
                    </div>
                    <div class="campaign-actions">
                        ${puedePostularse ? 
                            `<button class="btn apply-btn" data-campaign-id="${campania.id}">Postularme</button>` :
                            (currentUser.rol === 'voluntario' && estaPostulado ? 
                                '<button class="btn btn-success" disabled>Ya postulado</button>' : '')
                        }
                        <button class="btn details-btn" data-campaign-id="${campania.id}">Ver detalles</button>
                        ${currentUser.rol === 'voluntario' && estaPostulado ? 
                            `<button class="btn btn-danger cancel-btn" data-campaign-id="${campania.id}">Cancelar postulación</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = campaignsHTML;

    // Asignar event listeners
    document.querySelectorAll('.apply-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            aplicarACampania(parseInt(this.getAttribute('data-campaign-id')));
        });
    });
    
    document.querySelectorAll('.details-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            verDetallesCampania(parseInt(this.getAttribute('data-campaign-id')));
        });
    });

    document.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            cancelarPostulacion(parseInt(this.getAttribute('data-campaign-id')));
        });
    });
}

async function loadUserCampaigns() {
    const container = document.getElementById('user-campaigns');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Cargando tus campañas...</div>';
    
    try {
        let userCampaigns = [];
        let tituloSeccion = '';
        
        if (currentUser.rol === 'ong') {
            // Cargar campañas de la ONG
            const response = await fetch(`${API_BASE}campaigns.php?action=get_by_organization&org_id=${currentUser.id}`);
            const resultado = await response.json();
            
            // Parsear respuesta
            if (Array.isArray(resultado)) {
                userCampaigns = resultado;
            } else if (resultado.data && Array.isArray(resultado.data)) {
                userCampaigns = resultado.data;
            }
            tituloSeccion = 'Mis Campañas Creadas';
        } else if (currentUser.rol === 'coordinador') {
            // Cargar campañas del coordinador
            const response = await fetch(`${API_BASE}campaigns.php?action=get_by_coordinator&coord_id=${currentUser.id}`);
            const resultado = await response.json();
            
            // Parsear respuesta
            if (Array.isArray(resultado)) {
                userCampaigns = resultado;
            } else if (resultado.data && Array.isArray(resultado.data)) {
                userCampaigns = resultado.data;
            }
            tituloSeccion = 'Campañas Asignadas';
        } else {
            return; // Solo para ONG y coordinadores
        }
        
        console.log(`📊 Campañas de usuario cargadas: ${userCampaigns.length}`);
        
        let html = `
            <div class="campaigns-section">
                <h3>${tituloSeccion}</h3>
        `;
        
        if (!userCampaigns || userCampaigns.length === 0) {
            html += `
                <div class="no-campaigns">
                    <p>No tienes campañas ${currentUser.rol === 'ong' ? 'creadas' : 'asignadas'}.</p>
                    ${currentUser.rol === 'ong' ? '<p>¡Crea tu primera campaña desde la página principal!</p>' : ''}
                </div>
            `;
        } else {
            html += `<div class="campaigns-grid">`;
            
            userCampaigns.forEach(campania => {
                // Validar datos de la campaña
                if (!campania || !campania.id) return;
                
                // Obtener postulaciones pendientes para esta campaña
                const postulacionesCampania = window.postulaciones.filter(p => p.campania_id === campania.id);
                const postulacionesPendientes = postulacionesCampania.filter(p => p.estado === 'pendiente').length;
                
                // Sistema de reputación - Rating
                const ratingHTML = mostrarRatingCampania(campania.id);
                
                html += `
                    <div class="campaign-card">
                        <div class="campaign-image" style="background-color: ${getRandomColor()}">
                            ${campania.titulo ? campania.titulo.charAt(0) : 'C'}
                        </div>
                        <div class="campaign-content">
                            <h3 class="campaign-title">${campania.titulo || 'Campaña sin título'}</h3>
                            <p class="campaign-description">${campania.descripcion || 'Sin descripción disponible'}</p>
                            
                            <!-- Sistema de reputación - Rating display -->
                            ${ratingHTML ? `
                            <div class="campaign-rating-display">
                                ${ratingHTML}
                            </div>` : ''}
                            
                            <div class="campaign-details">
                                <span><strong>Fecha:</strong> ${formatearFecha(campania.fecha)}</span>
                                <span><strong>Ubicación:</strong> ${campania.ubicacion || 'No especificada'}</span>
                            </div>
                            <div class="campaign-details">
                                <span><strong>Voluntarios:</strong> ${campania.voluntarios_actuales || 0}/${campania.max_voluntarios || 0}</span>
                                <span><strong>Postulaciones pendientes:</strong> ${postulacionesPendientes}</span>
                            </div>
                            <div class="campaign-actions">
                                <button class="btn applications-btn" data-campaign-id="${campania.id}">Ver Postulaciones</button>
                                ${currentUser.rol === 'ong' ? 
                                    `<button class="btn btn-danger delete-btn" data-campaign-id="${campania.id}">Eliminar</button>` : 
                                    ''
                                }
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }
        
        html += `</div>`;
        container.innerHTML = html;
        
        // Asignar event listeners
        document.querySelectorAll('.applications-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                viewCampaignApplications(parseInt(this.getAttribute('data-campaign-id')));
            });
        });
        
        if (currentUser.rol === 'ong') {
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    deleteCampaign(parseInt(this.getAttribute('data-campaign-id')));
                });
            });
        }
        
    } catch (error) {
        console.error('Error cargando campañas de usuario:', error);
        container.innerHTML = `
            <div class="error">
                <p>Error al cargar tus campañas</p>
                <button onclick="loadUserCampaigns()" class="btn btn-retry">Reintentar</button>
            </div>
        `;
    }
}

async function cargarCoordinadores() {
    const select = document.getElementById('campaign-coordinator');
    if (!select) return;
    
    select.innerHTML = '<option value="">Seleccionar coordinador</option>';
    
    try {
        const coordinadores = await obtenerCoordinadores();
        
        coordinadores.forEach(coord => {
            const option = document.createElement('option');
            option.value = coord.id;
            option.textContent = `${coord.nombre} (${coord.especialidad || 'Sin especialidad'})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando coordinadores:', error);
    }
}

async function createCampaign() {
    if (currentUser.rol !== 'ong') {
        showMessage('campaign-message', 'Solo las ONGs pueden crear campañas', 'error');
        return;
    }
    
    const titulo = document.getElementById('campaign-title').value;
    const descripcion = document.getElementById('campaign-description').value;
    const ubicacion = document.getElementById('campaign-location').value;
    const fecha = document.getElementById('campaign-date').value;
    const hora = document.getElementById('campaign-time').value;
    const maxVoluntarios = parseInt(document.getElementById('campaign-max-volunteers').value);
    const requisitos = document.getElementById('campaign-requirements').value;
    const coordinadorId = document.getElementById('campaign-coordinator').value;
    
    // Validaciones
    if (!titulo || !descripcion || !ubicacion || !fecha || !hora || !coordinadorId) {
        showMessage('campaign-message', 'Por favor, completa todos los campos obligatorios', 'error');
        return;
    }
    
    // Validar fecha
    const hoy = new Date().toISOString().split('T')[0];
    if (fecha < hoy) {
        showMessage('campaign-message', 'La fecha no puede ser anterior a hoy', 'error');
        return;
    }
    
    try {
        // Obtener datos del coordinador
        const coordinador = window.usuarios.find(u => u.id === parseInt(coordinadorId));
        if (!coordinador) {
            showMessage('campaign-message', 'Coordinador no válido', 'error');
            return;
        }
        
        // Enviar a la API
        const response = await fetch(`${API_BASE}campaigns.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create',
                titulo: titulo,
                descripcion: descripcion,
                organizacion_id: currentUser.id,
                organizacion_nombre: currentUser.nombre,
                coordinador_id: coordinadorId,
                coordinador_nombre: coordinador.nombre,
                ubicacion: ubicacion,
                fecha: fecha,
                hora: hora,
                max_voluntarios: maxVoluntarios,
                voluntarios_actuales: 0,
                requisitos: requisitos || 'Ninguno'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('campaign-message', '¡Campaña creada exitosamente!', 'success');
            
            // Agregar a array global si existe
            if (result.campania) {
                window.campanias.push(result.campania);
            }
            
            // Limpiar formulario
            document.getElementById('campaign-title').value = '';
            document.getElementById('campaign-description').value = '';
            document.getElementById('campaign-location').value = '';
            document.getElementById('campaign-date').value = '';
            document.getElementById('campaign-time').value = '';
            document.getElementById('campaign-max-volunteers').value = '10';
            document.getElementById('campaign-requirements').value = '';
            document.getElementById('campaign-coordinator').value = '';
            
            // Redirigir después de 1.5 segundos
            setTimeout(() => {
                showHomePage();
            }, 1500);
        } else {
            showMessage('campaign-message', result.message || 'Error al crear campaña', 'error');
        }
    } catch (error) {
        console.error('Error creando campaña:', error);
        showMessage('campaign-message', 'Error de conexión al crear campaña', 'error');
    }
}

async function aplicarACampania(campaniaId) {
    if (currentUser.rol !== 'voluntario') {
        alert('Solo los voluntarios pueden postularse a campañas');
        return;
    }
    
    const campania = window.campanias.find(c => c.id === campaniaId);
    if (!campania) return;
    
    // Validaciones
    if (window.postulaciones.some(p => p.usuario_id === currentUser.id && p.campania_id === campaniaId)) {
        alert('Ya te has postulado a esta campaña');
        return;
    }
    
    if (campania.voluntarios_actuales >= campania.max_voluntarios) {
        alert('Lo sentimos, esta campaña ya ha alcanzado su cupo máximo');
        return;
    }
    
    const hoy = new Date().toISOString().split('T')[0];
    if (campania.fecha < hoy) {
        alert('Lo sentimos, esta campaña ya ha pasado');
        return;
    }
    
    try {
        // Enviar postulación a la API
        const response = await fetch(`${API_BASE}applications.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'apply',
                usuario_id: currentUser.id,
                campania_id: campaniaId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Crear postulación local
            const nuevaPostulacion = {
                id: window.postulaciones.length > 0 ? Math.max(...window.postulaciones.map(p => p.id)) + 1 : 1,
                usuario_id: currentUser.id,
                campania_id: campaniaId,
                estado: 'pendiente',
                fecha_postulacion: new Date().toISOString()
            };
            
            window.postulaciones.push(nuevaPostulacion);
            
            // Notificar al coordinador
            if (typeof crearNotificacion === 'function') {
                crearNotificacion(campania.coordinador_id, 'Nueva postulación', 
                    `El voluntario ${currentUser.nombre} se ha postulado a la campaña "${campania.titulo}"`);
            }
            
            alert('¡Postulación enviada correctamente! El coordinador revisará tu solicitud.');
            loadCampaigns();
        } else {
            alert(result.message || 'Error al enviar postulación');
        }
    } catch (error) {
        console.error('Error aplicando a campaña:', error);
        alert('Error de conexión al enviar postulación');
    }
}

async function cancelarPostulacion(campaniaId) {
    if (!confirm('¿Estás seguro de que quieres cancelar tu postulación?')) {
        return;
    }
    
    try {
        // Encontrar la postulación
        const postulacion = window.postulaciones.find(p => 
            p.usuario_id === currentUser.id && p.campania_id === campaniaId);
        
        if (!postulacion) return;
        
        // Eliminar de la API
        const response = await fetch(`${API_BASE}applications.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'cancel',
                id: postulacion.id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Eliminar localmente
            const appIndex = window.postulaciones.findIndex(app => 
                app.usuario_id === currentUser.id && app.campania_id === campaniaId);
            
            if (appIndex !== -1) {
                window.postulaciones.splice(appIndex, 1);
            }
            
            alert('Postulación cancelada correctamente');
            loadCampaigns();
        } else {
            alert(result.message || 'Error al cancelar postulación');
        }
    } catch (error) {
        console.error('Error cancelando postulación:', error);
        alert('Error de conexión al cancelar postulación');
    }
}

function verDetallesCampania(campaniaId) {
    const campania = window.campanias.find(c => c.id === campaniaId);
    if (!campania) return;
    
    alert(`Detalles de la campaña:\n\nTítulo: ${campania.titulo}\nOrganización: ${campania.organizacion_nombre}\nCoordinador: ${campania.coordinador_nombre}\nDescripción: ${campania.descripcion}\nUbicación: ${campania.ubicacion}\nFecha: ${formatearFecha(campania.fecha)} ${campania.hora}\nRequisitos: ${campania.requisitos || 'Ninguno'}\nCupo: ${campania.voluntarios_actuales}/${campania.max_voluntarios}`);
}

function viewCampaignApplications(campaniaId) {
    // Redirigir a la página de aplicaciones
    showApplicationsPage();
}

async function deleteCampaign(campaniaId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta campaña? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}campaigns.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete',
                id: campaniaId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Eliminar localmente
            const campaniaIndex = window.campanias.findIndex(c => c.id === campaniaId);
            if (campaniaIndex !== -1) {
                window.campanias.splice(campaniaIndex, 1);
            }
            
            // Eliminar postulaciones relacionadas
            window.postulaciones = window.postulaciones.filter(p => p.campania_id !== campaniaId);
            
            alert('Campaña eliminada correctamente');
            loadUserCampaigns();
        } else {
            alert(result.message || 'Error al eliminar campaña');
        }
    } catch (error) {
        console.error('Error eliminando campaña:', error);
        alert('Error de conexión al eliminar campaña');
    }
}

// Sistema de reputación - Función para mostrar rating en campañas
function mostrarRatingCampania(campaniaId) {
    const ratingsCampania = window.ratings.filter(r => r.campania_id === campaniaId);
    
    if (ratingsCampania.length === 0) {
        return '<div class="no-rating"><small>Sin calificaciones aún</small></div>';
    }
    
    const promedio = ratingsCampania.reduce((sum, r) => sum + r.rating, 0) / ratingsCampania.length;
    const estrellasLlenas = Math.round(promedio);
    
    return `
        <div class="rating-display">
            <span class="stars">
                ${'★'.repeat(estrellasLlenas)}${'☆'.repeat(5 - estrellasLlenas)}
            </span>
            <span class="rating-number">${promedio.toFixed(1)}</span>
            <small class="rating-count">(${ratingsCampania.length})</small>
        </div>
    `;
}

// Función auxiliar para formatear fechas
function formatearFecha(fechaString) {
    try {
        const fecha = new Date(fechaString);
        return fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return fechaString;
    }
}

// Función auxiliar para color aleatorio
function getRandomColor() {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ campaigns.js cargado correctamente');
    
    // Asignar eventos si existen los elementos
    const createBtn = document.getElementById('create-campaign-submit');
    if (createBtn) {
        createBtn.addEventListener('click', createCampaign);
    }
});