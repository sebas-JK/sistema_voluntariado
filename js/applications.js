// sistema_voluntariado/js/applications.js - MODIFICADO PARA MYSQL

async function loadApplications() {
    const container = document.getElementById('applications-container');
    container.innerHTML = '<div class="loading">Cargando postulaciones...</div>';
    
    try {
        let campaniasAGestionar = [];
        let postulacionesData = [];
        
        if (currentUser.rol === 'coordinador') {
            // Cargar campañas que coordina
            const responseCampanias = await fetch(`${API_BASE}/campaigns.php?action=get_by_coordinator&coord_id=${currentUser.id}`);
            campaniasAGestionar = await responseCampanias.json();
            
            // Cargar postulaciones para esas campañas
            const responsePostulaciones = await fetch(`${API_BASE}/applications.php?action=get_by_coordinator&coordinator_id=${currentUser.id}`);
            postulacionesData = await responsePostulaciones.json();
            
        } else if (currentUser.rol === 'ong') {
            // Cargar campañas de la ONG
            const responseCampanias = await fetch(`${API_BASE}/campaigns.php?action=get_by_organization&org_id=${currentUser.id}`);
            campaniasAGestionar = await responseCampanias.json();
            
            // Cargar postulaciones para esas campañas
            const responsePostulaciones = await fetch(`${API_BASE}/applications.php?action=get_by_organization&organization_id=${currentUser.id}`);
            postulacionesData = await responsePostulaciones.json();
        }
        
        // Actualizar arrays globales
        campanias = campaniasAGestionar;
        postulaciones = postulacionesData;
        
        if (campaniasAGestionar.length === 0) {
            container.innerHTML = '<p>No tienes campañas asignadas para gestionar.</p>';
            return;
        }
        
        let html = '';
        
        campaniasAGestionar.forEach(campania => {
            const postulacionesCampania = postulacionesData.filter(p => p.campania_id === campania.id);
            
            html += `
                <div class="applications-container">
                    <h3>${campania.titulo}</h3>
                    <p><strong>Organización:</strong> ${campania.organizacion_nombre} | 
                       <strong>Coordinador:</strong> ${campania.coordinador_nombre}</p>
                    <p><strong>Fecha:</strong> ${formatearFecha(campania.fecha)} ${campania.hora} | 
                       <strong>Ubicación:</strong> ${campania.ubicacion}</p>
                    <p><strong>Postulaciones:</strong> ${postulacionesCampania.length} | 
                       <strong>Cupo:</strong> ${campania.voluntarios_actuales}/${campania.max_voluntarios}</p>
                    <div id="postulaciones-${campania.id}">
                        ${postulacionesCampania.length === 0 ? 
                            '<p>No hay postulaciones para esta campaña.</p>' : 
                            ''}
                    </div>
                </div>
            `;
            
            // Mostrar cada postulación
            postulacionesCampania.forEach(postulacion => {
                const usuario = usuarios.find(u => u.id === postulacion.usuario_id);
                if (!usuario) return;
                
                const elementoPostulacion = document.createElement('div');
                elementoPostulacion.className = 'application-item';
                elementoPostulacion.innerHTML = `
                    <div class="application-info">
                        <h4>${usuario.nombre}</h4>
                        <p>${usuario.email} | Postulado: ${formatearFecha(postulacion.fecha_postulacion)}</p>
                        ${usuario.telefono ? `<p>Teléfono: ${usuario.telefono}</p>` : ''}
                    </div>
                    <div>
                        <span class="application-status status-${postulacion.estado}">${postulacion.estado}</span>
                        ${postulacion.estado === 'pendiente' ? 
                            `<button class="btn btn-success approve-btn" data-application-id="${postulacion.id}">Aprobar</button>
                             <button class="btn btn-danger reject-btn" data-application-id="${postulacion.id}">Rechazar</button>` : 
                            ''}
                    </div>
                `;
                
                // Agregar al DOM temporal
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                tempDiv.querySelector(`#postulaciones-${campania.id}`).appendChild(elementoPostulacion);
                html = tempDiv.innerHTML;
            });
        });
        
        container.innerHTML = html;

        // Asignar event listeners a los botones
        document.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                aprobarPostulacion(parseInt(this.getAttribute('data-application-id')));
            });
        });
        
        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                rechazarPostulacion(parseInt(this.getAttribute('data-application-id')));
            });
        });
        
    } catch (error) {
        console.error('Error cargando postulaciones:', error);
        container.innerHTML = '<div class="error">Error al cargar las postulaciones</div>';
    }
}

async function aprobarPostulacion(postulacionId) {
    const postulacion = postulaciones.find(p => p.id === postulacionId);
    if (!postulacion) return;
    
    const campania = campanias.find(c => c.id === postulacion.campania_id);
    if (!campania) return;
    
    // Verificar que aún hay cupo disponible
    if (campania.voluntarios_actuales >= campania.max_voluntarios) {
        alert('No hay cupo disponible en esta campaña');
        return;
    }
    
    try {
        // Actualizar en la API
        const response = await fetch(`${API_BASE}/applications.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'approve',
                id: postulacionId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Actualizar localmente
            postulacion.estado = 'aprobado';
            campania.voluntarios_actuales++;
            
            // Sincronizar cambio
            await sincronizarCambio('postulacion', {
                postulacion_update: {
                    id: postulacionId,
                    estado: 'aprobado'
                },
                campania_update: {
                    id: campania.id,
                    voluntarios_actuales: campania.voluntarios_actuales
                }
            });
            
            // Recargar vista
            loadApplications();
            
            // Notificar al voluntario
            if (typeof crearNotificacion === 'function') {
                crearNotificacion(postulacion.usuario_id, 'Postulación aprobada', 
                    `¡Felicidades! Tu postulación a "${campania.titulo}" ha sido aprobada.`);
            }
            
            alert('Postulación aprobada correctamente');
        } else {
            alert(result.message || 'Error al aprobar postulación');
        }
    } catch (error) {
        console.error('Error aprobando postulación:', error);
        alert('Error de conexión al aprobar postulación');
    }
}

async function rechazarPostulacion(postulacionId) {
    const postulacion = postulaciones.find(p => p.id === postulacionId);
    if (!postulacion) return;
    
    try {
        // Actualizar en la API
        const response = await fetch(`${API_BASE}/applications.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'reject',
                id: postulacionId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Actualizar localmente
            postulacion.estado = 'rechazado';
            
            // Sincronizar cambio
            await sincronizarCambio('postulacion', {
                postulacion_update: {
                    id: postulacionId,
                    estado: 'rechazado'
                }
            });
            
            // Recargar vista
            loadApplications();
            
            // Notificar al voluntario
            const campania = campanias.find(c => c.id === postulacion.campania_id);
            if (campania && typeof crearNotificacion === 'function') {
                crearNotificacion(postulacion.usuario_id, 'Postulación rechazada', 
                    `Tu postulación a "${campania.titulo}" ha sido rechazada.`);
            }
            
            alert('Postulación rechazada');
        } else {
            alert(result.message || 'Error al rechazar postulación');
        }
    } catch (error) {
        console.error('Error rechazando postulación:', error);
        alert('Error de conexión al rechazar postulación');
    }
}