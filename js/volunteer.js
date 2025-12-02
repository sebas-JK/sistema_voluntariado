// sistema_voluntariado/js/volunteer.js - MODIFICADO PARA MYSQL

async function cargarHistorialVoluntario() {
    const container = document.getElementById('user-campaigns');
    container.innerHTML = '<div class="loading">Cargando tu historial...</div>';
    
    try {
        // Obtener postulaciones aprobadas del usuario
        const responsePostulaciones = await fetch(`${API_BASE}/applications.php?action=get_by_user&user_id=${currentUser.id}`);
        const postulacionesAprobadas = (await responsePostulaciones.json()).filter(p => p.estado === 'aprobado');
        
        // Obtener tareas verificadas del usuario
        const responseTareas = await fetch(`${API_BASE}/tasks.php?action=get_verified&user_id=${currentUser.id}`);
        const tareasVerificadas = await responseTareas.json();
        
        // Calcular estadísticas
        const horasTotales = tareasVerificadas.reduce((total, t) => total + t.horas_trabajadas, 0);
        const campaniasParticipadas = new Set(tareasVerificadas.map(t => t.campania_id)).size;
        
        let html = `
            <div class="stats-section">
                <h3>Mis Estadísticas</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h4>Horas Totales</h4>
                        <p class="stat-number">${horasTotales}</p>
                    </div>
                    <div class="stat-card">
                        <h4>Tareas Completadas</h4>
                        <p class="stat-number">${tareasVerificadas.length}</p>
                    </div>
                    <div class="stat-card">
                        <h4>Campañas Participadas</h4>
                        <p class="stat-number">${campaniasParticipadas}</p>
                    </div>
                    <div class="stat-card">
                        <h4>Postulaciones Aprobadas</h4>
                        <p class="stat-number">${postulacionesAprobadas.length}</p>
                    </div>
                </div>
            </div>
        `;
        
        // Historial de actividades
        html += `
            <div class="history-section">
                <h3>Mis Actividades Recientes</h3>
        `;
        
        if (tareasVerificadas.length === 0 && postulacionesAprobadas.length === 0) {
            html += '<p>No tienes actividades registradas todavía.</p>';
        } else {
            // Mostrar tareas verificadas
            tareasVerificadas.slice(0, 5).forEach(tarea => {
                const campania = campanias.find(c => c.id === tarea.campania_id);
                html += `
                    <div class="history-item">
                        <h4>${tarea.descripcion}</h4>
                        <p><strong>Campaña:</strong> ${campania ? campania.titulo : 'N/A'}</p>
                        <p><strong>Horas:</strong> ${tarea.horas_trabajadas} | <strong>Fecha:</strong> ${formatearFecha(tarea.fecha_verificacion)}</p>
                        <span class="application-status status-approved">Verificada</span>
                    </div>
                `;
            });
            
            // Mostrar postulaciones aprobadas recientes
            postulacionesAprobadas.slice(0, 3).forEach(postulacion => {
                const campania = campanias.find(c => c.id === postulacion.campania_id);
                if (campania) {
                    html += `
                        <div class="history-item">
                            <h4>Postulación Aprobada</h4>
                            <p><strong>Campaña:</strong> ${campania.titulo}</p>
                            <p><strong>Organización:</strong> ${campania.organizacion_nombre}</p>
                            <p><strong>Fecha de aprobación:</strong> ${formatearFecha(postulacion.fecha_postulacion)}</p>
                            <span class="application-status status-approved">Aprobada</span>
                        </div>
                    `;
                }
            });
        }
        
        html += `</div>`;
        
        // Logros y reconocimientos
        const logrosUsuario = await obtenerLogrosUsuario(currentUser.id);
        html += `
            <div class="achievements-section">
                <h3>Mis Logros y Reconocimientos</h3>
                <div class="achievements-grid">
        `;
        
        if (!logrosUsuario || logrosUsuario.length === 0) {
            html += '<p>Aún no has obtenido logros. ¡Sigue participando en actividades!</p>';
        } else {
            logrosUsuario.forEach(logro => {
                html += `
                    <div class="achievement-card">
                        <div class="achievement-icon">${logro.insignia}</div>
                        <h4>${logro.nombre}</h4>
                        <p>Obtenido: ${formatearFecha(logro.fecha_otorgamiento)}</p>
                        <small>${logro.tipo === 'automatico' ? 'Logro automático' : 'Reconocimiento especial'}</small>
                    </div>
                `;
            });
        }
        
        html += `
                </div>
            </div>
        `;
        
        // Sistema de reputación - Nueva sección
        const ratingsHTML = await cargarSeccionCalificaciones();
        html += ratingsHTML;
        
        container.innerHTML = html;
        
        // Asignar event listeners para calificaciones
        asignarEventListenersCalificaciones();
        
    } catch (error) {
        console.error('Error cargando historial voluntario:', error);
        container.innerHTML = '<div class="error">Error al cargar tu historial</div>';
    }
}

async function cargarSeccionCalificaciones() {
    const campañasParaCalificar = await obtenerCampañasParaCalificar();
    
    if (!campañasParaCalificar || campañasParaCalificar.length === 0) {
        return '';
    }
    
    let html = `
        <div class="ratings-section">
            <h3>⭐ Califica Tus Experiencias</h3>
            <p>Califica las campañas en las que participaste:</p>
            <div class="ratings-container">
    `;
    
    for (const campania of campañasParaCalificar) {
        html += generarCardCalificacion(campania);
    }
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

async function obtenerCampañasParaCalificar() {
    try {
        // Obtener campañas en las que el usuario participó
        const responsePostulaciones = await fetch(`${API_BASE}/applications.php?action=get_by_user&user_id=${currentUser.id}`);
        const postulacionesUsuario = await responsePostulaciones.json();
        
        const campañasAprobadas = postulacionesUsuario
            .filter(p => p.estado === 'aprobado')
            .map(p => p.campania_id);
        
        // Obtener campañas ya calificadas
        const responseRatings = await fetch(`${API_BASE}/ratings.php?action=check_user_rating&user_id=${currentUser.id}`);
        const ratingsUsuario = await responseRatings.json();
        
        // Filtrar campañas completadas y no calificadas
        const hoy = new Date();
        const campañasCompletadas = [];
        
        for (const campaniaId of campañasAprobadas) {
            const responseCampania = await fetch(`${API_BASE}/campaigns.php?action=get_by_id&id=${campaniaId}`);
            const campania = await responseCampania.json();
            
            if (campania && !campania.error) {
                const fechaCampania = new Date(campania.fecha);
                
                // Verificar si ya calificó esta campaña
                const yaCalifico = ratings.some(r => 
                    r.usuario_id === currentUser.id && 
                    r.campania_id === campania.id
                );
                
                if (fechaCampania < hoy && !yaCalifico) {
                    campañasCompletadas.push(campania);
                }
            }
        }
        
        return campañasCompletadas;
    } catch (error) {
        console.error('Error obteniendo campañas para calificar:', error);
        return [];
    }
}

function generarCardCalificacion(campania) {
    return `
        <div class="rating-card" data-campaign-id="${campania.id}">
            <div class="rating-header">
                <h4>${campania.titulo}</h4>
                <span class="campaign-org">${campania.organizacion_nombre}</span>
            </div>
            <p class="campaign-date">${formatearFecha(campania.fecha)}</p>
            
            <div class="rating-stars">
                <p>¿Cómo calificarías esta experiencia?</p>
                <div class="stars">
                    <span class="star" data-rating="1">☆</span>
                    <span class="star" data-rating="2">☆</span>
                    <span class="star" data-rating="3">☆</span>
                    <span class="star" data-rating="4">☆</span>
                    <span class="star" data-rating="5">☆</span>
                </div>
                <div class="rating-labels">
                    <span>Mala</span>
                    <span>Excelente</span>
                </div>
            </div>
            
            <div class="rating-comment" style="display: none;">
                <textarea placeholder="Comentario opcional (qué te gustó, qué mejorarían...)" 
                         class="comment-textarea"></textarea>
                <button class="btn btn-primary submit-rating">Enviar Calificación</button>
                <button class="btn btn-secondary skip-rating">Omitir</button>
            </div>
        </div>
    `;
}

function asignarEventListenersCalificaciones() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('star')) {
            const star = e.target;
            const ratingCard = star.closest('.rating-card');
            const stars = ratingCard.querySelectorAll('.star');
            const rating = parseInt(star.getAttribute('data-rating'));
            
            stars.forEach((s, index) => {
                s.textContent = index < rating ? '★' : '☆';
                s.style.color = index < rating ? '#ffc107' : '#ccc';
            });
            
            ratingCard.querySelector('.rating-comment').style.display = 'block';
            ratingCard.setAttribute('data-selected-rating', rating);
        }
        
        if (e.target.classList.contains('submit-rating')) {
            const ratingCard = e.target.closest('.rating-card');
            enviarCalificacion(ratingCard);
        }
        
        if (e.target.classList.contains('skip-rating')) {
            const ratingCard = e.target.closest('.rating-card');
            ratingCard.style.display = 'none';
        }
    });
}

async function enviarCalificacion(ratingCard) {
    const campaniaId = parseInt(ratingCard.getAttribute('data-campaign-id'));
    const rating = parseInt(ratingCard.getAttribute('data-selected-rating'));
    const comentario = ratingCard.querySelector('.comment-textarea').value;
    
    const campania = campanias.find(c => c.id === campaniaId);
    if (!campania) return;
    
    try {
        const response = await fetch(`${API_BASE}/ratings.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'rate',
                usuario_id: currentUser.id,
                campania_id: campaniaId,
                organizacion_id: campania.organizacion_id,
                rating: rating,
                comentario: comentario || ''
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Agregar localmente
            const nuevaCalificacion = {
                id: ratings.length > 0 ? Math.max(...ratings.map(r => r.id)) + 1 : 1,
                usuario_id: currentUser.id,
                usuario_nombre: currentUser.nombre,
                campania_id: campaniaId,
                campania_titulo: campania.titulo,
                organizacion_id: campania.organizacion_id,
                rating: rating,
                comentario: comentario || '',
                fecha_calificacion: new Date().toISOString()
            };
            
            ratings.push(nuevaCalificacion);
            
            // Sincronizar
            await sincronizarCambio('rating', {
                rating_new: {
                    usuario_id: currentUser.id,
                    campania_id: campaniaId,
                    organizacion_id: campania.organizacion_id,
                    rating: rating,
                    comentario: comentario || ''
                }
            });
            
            // Actualizar rating de la organización localmente
            await actualizarRatingOrganizacion(campania.organizacion_id);
            
            showMessage('user-campaigns', `¡Gracias! Calificaste con ${rating} estrellas`, 'success');
            
            setTimeout(() => {
                showProfilePage();
            }, 1500);
        } else {
            alert('Error al enviar calificación: ' + result.message);
        }
    } catch (error) {
        console.error('Error enviando calificación:', error);
        alert('Error de conexión al enviar calificación');
    }
}

async function actualizarRatingOrganizacion(organizacionId) {
    try {
        const response = await fetch(`${API_BASE}/ratings.php?action=get_average&organization_id=${organizacionId}`);
        const ratingData = await response.json();
        
        const organizacion = usuarios.find(u => u.id === organizacionId);
        if (organizacion && ratingData) {
            organizacion.rating_promedio = parseFloat(ratingData.promedio) || 0;
            organizacion.total_calificaciones = parseInt(ratingData.total) || 0;
        }
    } catch (error) {
        console.error('Error actualizando rating de organización:', error);
    }
}