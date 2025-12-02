// sistema_voluntariado/js/navigation.js - MODIFICADO PARA MYSQL

// Configurar navegación del menú
function setupNavigation() {
    document.addEventListener('click', function(e) {
        if (e.target.matches('a[href="#"]') || e.target.closest('a[href="#"]')) {
            e.preventDefault();
            const link = e.target.closest('a');
            if (link) {
                const action = link.getAttribute('data-action');
                if (action) {
                    switch(action) {
                        case 'home': showHomePage(); break;
                        case 'profile': showProfilePage(); break;
                        case 'messages': showMessagesPage(); break;
                        case 'geolocation': mostrarMapaPage(); break;
                        case 'reports': mostrarReportesPage(); break;
                        case 'applications': showApplicationsPage(); break;
                        case 'logout': logout(); break;
                        case 'login': showLoginPage(); break;
                    }
                }
            }
        }
    });
}

// Funciones de navegación
function showLoginPage() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('login-page').classList.add('active');
}

async function showHomePage() {
    console.log('🔵 Mostrando página de inicio');
    
    // 1. Mostrar la página
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('home-page').classList.add('active');
    
    // 2. Recargar datos si es necesario
    if (campanias.length === 0) {
        await cargarTodosLosDatos();
    }
    
    // 3. Actualizar vista según rol
    actualizarVistaSegunRol();
    
    // 4. Cargar campañas
    if (typeof loadCampaigns === 'function') {
        await loadCampaigns();
    } else {
        console.error('❌ loadCampaigns no disponible');
    }
    
    // 5. Inicializar búsqueda si existe
    if (typeof inicializarBusqueda === 'function') {
        inicializarBusqueda();
    }
}

async function showProfilePage() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('profile-page').classList.add('active');
    
    // Recargar datos del usuario si es necesario
    if (currentUser && usuarios.length === 0) {
        await cargarTodosLosDatos();
    }
    
    // Actualizar información del usuario
    const userInfo = document.querySelector('.user-info');
    const rolTexto = {
        'voluntario': 'Voluntario',
        'ong': 'ONG',
        'coordinador': 'Coordinador'
    };
    
    let infoAdicional = '';
    
    if (currentUser) {
        if (currentUser.rol === 'ong') {
            infoAdicional = `
                <p><strong>Descripción:</strong> ${currentUser.descripcion || 'No especificada'}</p>
                <p><strong>Teléfono:</strong> ${currentUser.telefono || 'No especificado'}</p>
                <p><strong>Dirección:</strong> ${currentUser.direccion || 'No especificada'}</p>
            `;
        } else if (currentUser.rol === 'coordinador') {
            infoAdicional = `
                <p><strong>Especialidad:</strong> ${currentUser.especialidad || 'No especificada'}</p>
                <p><strong>Teléfono:</strong> ${currentUser.telefono || 'No especificado'}</p>
            `;
        } else if (currentUser.rol === 'voluntario') {
            const intereses = currentUser.intereses && currentUser.intereses.length > 0 ? 
                (Array.isArray(currentUser.intereses) ? currentUser.intereses.join(', ') : currentUser.intereses) : 'No especificados';
            infoAdicional = `
                <p><strong>Teléfono:</strong> ${currentUser.telefono || 'No especificado'}</p>
                <p><strong>Intereses:</strong> ${intereses}</p>
            `;
        }
        
        userInfo.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2 style="margin: 0;">${currentUser.nombre}</h2>
                <span class="user-role">${rolTexto[currentUser.rol]}</span>
            </div>
            <p><strong>Email:</strong> ${currentUser.email}</p>
            <p><strong>Fecha de registro:</strong> ${formatearFecha(currentUser.fecha_registro)}</p>
            ${infoAdicional}
            <button class="btn" onclick="showEditProfile()" style="margin-top: 1rem;">Editar Perfil</button>
        `;
        
        // Cargar contenido específico según el rol
        const userCampaignsContainer = document.getElementById('user-campaigns');
        
        if (currentUser.rol === 'voluntario') {
            if (typeof cargarHistorialVoluntario === 'function') {
                await cargarHistorialVoluntario();
            }
        } else if (currentUser.rol === 'ong' || currentUser.rol === 'coordinador') {
            if (typeof loadUserCampaigns === 'function') {
                await loadUserCampaigns();
            }
        }
    }
}

function showEditProfile() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('edit-profile-page').classList.add('active');
    
    // Cargar datos actuales
    document.getElementById('edit-name').value = currentUser.nombre;
    document.getElementById('edit-email').value = currentUser.email;
    document.getElementById('edit-phone').value = currentUser.telefono || '';
    
    // Mostrar campos según el rol
    document.getElementById('edit-ong-fields').style.display = 'none';
    document.getElementById('edit-coordinator-fields').style.display = 'none';
    document.getElementById('edit-volunteer-fields').style.display = 'none';
    
    if (currentUser.rol === 'ong') {
        document.getElementById('edit-ong-fields').style.display = 'block';
        document.getElementById('edit-description').value = currentUser.descripcion || '';
        document.getElementById('edit-address').value = currentUser.direccion || '';
    } else if (currentUser.rol === 'coordinador') {
        document.getElementById('edit-coordinator-fields').style.display = 'block';
        document.getElementById('edit-specialty').value = currentUser.especialidad || '';
    } else if (currentUser.rol === 'voluntario') {
        document.getElementById('edit-volunteer-fields').style.display = 'block';
        const intereses = currentUser.intereses ? 
            (Array.isArray(currentUser.intereses) ? currentUser.intereses.join(', ') : currentUser.intereses) : '';
        document.getElementById('edit-interests').value = intereses;
    }
    
    document.getElementById('edit-notifications').checked = currentUser.notificaciones !== false;
}

async function showApplicationsPage() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('applications-page').classList.add('active');
    
    if (typeof loadApplications === 'function') {
        await loadApplications();
    }
}

function showMessagesPage() {
    console.log('🔵 Intentando mostrar página de mensajes...');
    
    // Primero ocultar todas las páginas
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    // Mostrar la página de mensajes
    const messagesPage = document.getElementById('messages-page');
    if (messagesPage) {
        messagesPage.classList.add('active');
    } else {
        console.error('❌ No se encontró messages-page');
        return;
    }
    
    // Verificar si la función existe
    if (typeof cargarPaginaMensajes !== 'function') {
        console.error('❌ cargarPaginaMensajes no está disponible');
        messagesPage.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <h2>💬 Mensajes</h2>
                <div style="color: #e74c3c; background: #fdf2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Error:</strong> El sistema de mensajería no se cargó correctamente</p>
                    <p>Recarga la página o contacta al administrador.</p>
                </div>
                <button class="btn btn-primary" onclick="showHomePage()">Volver al Inicio</button>
            </div>
        `;
        return;
    }
    
    // Intentar cargar la página de mensajes
    try {
        cargarPaginaMensajes();
        console.log('✅ Página de mensajes cargada correctamente');
    } catch (error) {
        console.error('❌ Error al cargar mensajes:', error);
        messagesPage.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <h2>💬 Mensajes</h2>
                <div style="color: #e74c3c; background: #fdf2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Error:</strong> ${error.message}</p>
                    <p>Recarga la página para intentarlo de nuevo.</p>
                </div>
                <button class="btn btn-primary" onclick="showHomePage()">Volver al Inicio</button>
                <button class="btn btn-secondary" onclick="location.reload()" style="margin-left: 10px;">Recargar</button>
            </div>
        `;
    }
}

function showCalendarPage() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('calendar-page').classList.add('active');
    
    if (typeof generateCalendar === 'function') {
        generateCalendar();
    }
}

// En la función updateNavigation()
function updateNavigation() {
    const navMenu = document.getElementById('nav-menu');
    navMenu.innerHTML = '';
    
    if (currentUser) {
        navMenu.innerHTML = `
            <li><a href="#" data-action="home">Inicio</a></li>
            <li><a href="#" data-action="profile">Mi Perfil</a></li>
            <li><a href="#" data-action="messages">💬 Mensajes</a></li>
            <li><a href="#" data-action="geolocation">🗺️ Mapa</a></li>
        `;
        
        if (currentUser.rol === 'ong' || currentUser.rol === 'coordinador') {
            navMenu.innerHTML += `<li><a href="#" data-action="reports">📊 Reportes</a></li>`;
        }
        
        if (currentUser.rol === 'coordinador') {
            navMenu.innerHTML += `<li><a href="#" data-action="applications">Gestionar Postulaciones</a></li>`;
        }
        
        navMenu.innerHTML += `<li><a href="#" data-action="logout">Cerrar Sesión</a></li>`;
    } else {
        navMenu.innerHTML = `
            <li><a href="#" data-action="login">Iniciar Sesión</a></li>
        `;
    }
}

// Función para mostrar/ocultar elementos según rol
function actualizarVistaSegunRol() {
    if (!currentUser) return;
    
    const crearCampaniaBtn = document.getElementById('create-campaign-btn');
    const asignarCoordinador = document.getElementById('coordinator-assignment');
    
    if (crearCampaniaBtn) {
        if (currentUser.rol === 'ong') {
            crearCampaniaBtn.style.display = 'inline-block';
        } else {
            crearCampaniaBtn.style.display = 'none';
        }
    }
    
    if (asignarCoordinador) {
        if (currentUser.rol === 'ong') {
            asignarCoordinador.style.display = 'block';
        } else {
            asignarCoordinador.style.display = 'none';
        }
    }
    
    console.log('✅ Vista actualizada según rol:', currentUser.rol);
}

function mostrarReportesPage() {
    console.log('🔵 Mostrando página de reportes...');
    
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    const reportsPage = document.getElementById('reports-page');
    if (reportsPage) {
        reportsPage.classList.add('active');
    } else {
        console.error('❌ No se encontró reports-page');
        document.getElementById('profile-page').classList.add('active');
    }
    
    if (typeof mostrarPanelReportes === 'function') {
        mostrarPanelReportes();
    } else {
        console.error('❌ mostrarPanelReportes no disponible');
        const container = document.getElementById('reports-page') || document.getElementById('profile-page');
        if (container) {
            container.innerHTML = `
                <div style="padding: 40px; text-align: center;">
                    <h2>📊 Sistema de Reportes</h2>
                    <p>El sistema de reportes se está cargando...</p>
                    <button class="btn btn-primary" onclick="location.reload()">Recargar</button>
                </div>
            `;
        }
    }
}