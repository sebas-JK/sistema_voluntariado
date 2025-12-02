// sistema_voluntariado/js/auth.js - MODIFICADO PARA MYSQL

// Definir API_BASE para evitar el error ReferenceError
//const API_BASE = window.location.origin + '/sistema_voluntariado/api/';
// Alternativa si estás en localhost:
 const API_BASE = 'http://localhost/sistema_voluntariado/api/';

// Si usas un archivo config.js aparte, podrías usar:
//const API_BASE = window.API_BASE || 'http://localhost/sistema_voluntariado/api/';

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showMessage('login-message', 'Por favor completa todos los campos', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}auth.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'login',
                email: email,
                password: password
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Guardar usuario en variable global
            currentUser = result.user;
            
            // Guardar en localStorage para mantener sesión
            localStorage.setItem('sgv_currentUser', JSON.stringify(currentUser));
            
            // Recargar datos específicos del usuario
            await cargarTodosLosDatos();
            
            // Actualizar interfaz
            updateNavigation();
            showHomePage();
            
            showMessage('login-message', `¡Bienvenido ${currentUser.nombre}!`, 'success');
            
            // Cargar notificaciones del usuario
            if (typeof cargarNotificacionesUsuario === 'function') {
                cargarNotificacionesUsuario(currentUser.id);
            }
        } else {
            showMessage('login-message', result.message || 'Credenciales incorrectas', 'error');
        }
    } catch (error) {
        console.error('Error en login:', error);
        showMessage('login-message', 'Error de conexión con el servidor', 'error');
    }
}

async function register() {
    const nombre = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const rol = document.getElementById('register-role').value;
    
    // Validaciones (se mantienen igual)
    if (!nombre || !email || !password) {
        showMessage('login-message', 'Todos los campos son obligatorios', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('login-message', 'La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}auth.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'register',
                nombre: nombre,
                email: email,
                password: password,
                rol: rol,
                telefono: ''
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('login-message', `¡Registro exitoso! Ahora puedes iniciar sesión como ${rol}`, 'success');
            
            // Cambiar a formulario de login
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.querySelector('.tab[data-tab="login"]').classList.add('active');
            document.getElementById('login-form').classList.add('active');
            
            // Limpiar formulario
            document.getElementById('register-name').value = '';
            document.getElementById('register-email').value = '';
            document.getElementById('register-password').value = '';
            
            // Recargar usuarios en memoria
            await cargarTodosLosDatos();
        } else {
            showMessage('login-message', result.message || 'Error al registrar usuario', 'error');
        }
    } catch (error) {
        console.error('Error en registro:', error);
        showMessage('login-message', 'Error de conexión con el servidor', 'error');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('sgv_currentUser');
    updateNavigation();
    showLoginPage();
    
    // Limpiar datos en memoria (opcional)
    usuarios = [];
    campanias = [];
    postulaciones = [];
}

async function saveProfile() {
    const nombre = document.getElementById('edit-name').value;
    const email = document.getElementById('edit-email').value;
    const telefono = document.getElementById('edit-phone').value;
    const notificaciones = document.getElementById('edit-notifications').checked;
    
    // Validaciones básicas
    if (!nombre || !email) {
        alert('Nombre y email son obligatorios');
        return;
    }
    
    // Preparar datos
    const userData = {
        action: 'update_profile',
        id: currentUser.id,
        nombre: nombre,
        email: email,
        telefono: telefono,
        notificaciones: notificaciones ? 1 : 0
    };
    
    // Campos específicos por rol
    if (currentUser.rol === 'ong') {
        userData.descripcion = document.getElementById('edit-description').value;
        userData.direccion = document.getElementById('edit-address').value;
    } else if (currentUser.rol === 'coordinador') {
        userData.especialidad = document.getElementById('edit-specialty').value;
    } else if (currentUser.rol === 'voluntario') {
        const intereses = document.getElementById('edit-interests').value;
        userData.intereses = intereses ? intereses.split(',').map(i => i.trim()) : [];
    }
    
    try {
        const response = await fetch(`${API_BASE}auth.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Actualizar usuario en memoria
            const userIndex = usuarios.findIndex(u => u.id === currentUser.id);
            if (userIndex !== -1) {
                Object.assign(usuarios[userIndex], userData);
            }
            
            // Actualizar currentUser
            Object.assign(currentUser, userData);
            localStorage.setItem('sgv_currentUser', JSON.stringify(currentUser));
            
            alert('Perfil actualizado correctamente');
            showProfilePage();
        } else {
            alert('Error al actualizar perfil: ' + result.message);
        }
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        alert('Error de conexión al actualizar perfil');
    }
}

// Función para obtener coordinadores (usada en campaigns.js)
async function obtenerCoordinadores() {
    try {
        const response = await fetch(`${API_BASE}auth.php?action=get_coordinadores`);
        const result = await response.json();
        if (result.success) {
            return result.data || [];
        } else {
            console.error('Error obteniendo coordinadores:', result.message);
            return [];
        }
    } catch (error) {
        console.error('Error obteniendo coordinadores:', error);
        return [];
    }
}

// Inicializar eventos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Asignar eventos a los botones de login/register
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', login);
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', register);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }
    
    // Permitir login con Enter en los campos
    const loginPassword = document.getElementById('login-password');
    if (loginPassword) {
        loginPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                login();
            }
        });
    }
    
    const registerPassword = document.getElementById('register-password');
    if (registerPassword) {
        registerPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                register();
            }
        });
    }
    
    console.log('✅ auth.js cargado correctamente');
});