// sistema_voluntariado/js/messaging.js - MODIFICADO PARA MYSQL

let conversacionActual = null;
let intervaloMensajes = null;

async function cargarPaginaMensajes() {
    try {
        if (!currentUser || !currentUser.id) {
            console.error('❌ Usuario no logueado');
            const container = document.getElementById('messages-page');
            container.innerHTML = `
                <div class="error-message">
                    <h2>💬 Mensajes</h2>
                    <p>Debes iniciar sesión para ver los mensajes</p>
                    <button class="btn btn-primary" onclick="showLoginPage()">Iniciar Sesión</button>
                </div>
            `;
            return;
        }

        const container = document.getElementById('messages-page');
        
        container.innerHTML = `
            <div class="messages-container">
                <div class="messages-header">
                    <h2>💬 Mensajes</h2>
                    <button class="btn btn-primary" onclick="mostrarModalNuevoMensaje()">Nuevo Mensaje</button>
                </div>
                
                <div class="messages-layout">
                    <!-- Lista de conversaciones -->
                    <div class="conversations-list">
                        <h3>Conversaciones</h3>
                        <div class="search-conversations">
                            <input type="text" id="search-users" placeholder="Buscar usuarios..." 
                                   onkeyup="buscarUsuarios(this.value)">
                        </div>
                        <div id="conversations-container" class="conversations-container">
                            ${await generarListaConversaciones()}
                        </div>
                    </div>
                    
                    <!-- Área de chat -->
                    <div class="chat-area">
                        <div id="chat-header" class="chat-header">
                            <div class="no-chat-selected">
                                <p>Selecciona una conversación para empezar a chatear</p>
                            </div>
                        </div>
                        
                        <div id="messages-area" class="messages-area">
                            <div class="no-messages">
                                <p>No hay mensajes seleccionados</p>
                            </div>
                        </div>
                        
                        <div id="message-input-container" class="message-input-container" style="display: none;">
                            <div class="message-input">
                                <textarea id="message-text" placeholder="Escribe tu mensaje..." 
                                         rows="2" onkeydown="manejarEnter(event)"></textarea>
                                <button class="btn btn-primary send-btn" onclick="enviarMensaje()">Enviar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Modal para nuevo mensaje -->
            <div id="new-message-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Nuevo Mensaje</h3>
                        <span class="close" onclick="cerrarModalNuevoMensaje()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Para:</label>
                            <select id="message-recipient">
                                <option value="">Seleccionar destinatario</option>
                                ${generarOpcionesUsuarios()}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Mensaje:</label>
                            <textarea id="new-message-text" rows="4" placeholder="Escribe tu mensaje..."></textarea>
                        </div>
                        <div class="modal-actions">
                            <button class="btn btn-secondary" onclick="cerrarModalNuevoMensaje()">Cancelar</button>
                            <button class="btn btn-primary" onclick="crearNuevaConversacion()">Enviar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Iniciar polling para nuevos mensajes
        iniciarPollingMensajes();
        
    } catch (error) {
        console.error('❌ Error en cargarPaginaMensajes:', error);
        const container = document.getElementById('messages-page');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h2>💬 Mensajes</h2>
                    <p>Error al cargar los mensajes: ${error.message}</p>
                    <button class="btn btn-primary" onclick="cargarPaginaMensajes()">Reintentar</button>
                </div>
            `;
        }
    }
}

async function generarListaConversaciones() {
    try {
        const conversaciones = await obtenerConversacionesUsuario();
        
        if (!conversaciones || conversaciones.length === 0) {
            return '<div class="no-conversations"><p>No tienes conversaciones</p></div>';
        }
        
        let html = '';
        
        for (const conversacion of conversaciones) {
            const otroUsuario = obtenerOtroUsuarioConversacion(conversacion);
            const ultimoMensaje = conversacion.mensajes && conversacion.mensajes.length > 0 
                ? conversacion.mensajes[conversacion.mensajes.length - 1] 
                : null;
            
            const noLeidos = await contarMensajesNoLeidos(conversacion);
            
            html += `
                <div class="conversation-item ${conversacion.id === conversacionActual?.id ? 'active' : ''}" 
                     onclick="seleccionarConversacion('${conversacion.id}')">
                    <div class="conversation-avatar">${otroUsuario?.nombre?.charAt(0) || '?'}</div>
                    <div class="conversation-info">
                        <div class="conversation-header">
                            <strong>${otroUsuario?.nombre || 'Usuario desconocido'}</strong>
                            <span class="conversation-time">${formatearHora(ultimoMensaje?.fecha)}</span>
                        </div>
                        <p class="conversation-preview">${ultimoMensaje?.texto || 'Sin mensajes'}</p>
                        ${noLeidos > 0 ? `<span class="unread-badge">${noLeidos}</span>` : ''}
                    </div>
                </div>
            `;
        }
        
        return html;
    } catch (error) {
        console.error('❌ Error en generarListaConversaciones:', error);
        return '<div class="no-conversations"><p>Error al cargar conversaciones</p></div>';
    }
}

async function obtenerConversacionesUsuario() {
    try {
        // Cargar mensajes del usuario desde API
        const response = await fetch(`${API_BASE}/messages.php?action=get_user&user_id=${currentUser.id}`);
        const mensajesUsuario = await response.json();
        
        // Agrupar mensajes por conversación
        const conversacionesMap = new Map();
        
        mensajesUsuario.forEach(mensaje => {
            const otroUsuarioId = mensaje.remitente_id === currentUser.id 
                ? mensaje.destinatario_id 
                : mensaje.remitente_id;
            
            const conversacionId = [currentUser.id, otroUsuarioId].sort().join('_');
            
            if (!conversacionesMap.has(conversacionId)) {
                conversacionesMap.set(conversacionId, {
                    id: conversacionId,
                    usuario1_id: currentUser.id,
                    usuario2_id: otroUsuarioId,
                    mensajes: []
                });
            }
            
            conversacionesMap.get(conversacionId).mensajes.push(mensaje);
        });
        
        // Convertir a array y ordenar por último mensaje
        const conversaciones = Array.from(conversacionesMap.values());
        
        conversaciones.forEach(conversacion => {
            conversacion.mensajes.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        });
        
        return conversaciones.sort((a, b) => {
            const ultimoA = a.mensajes[a.mensajes.length - 1]?.fecha;
            const ultimoB = b.mensajes[b.mensajes.length - 1]?.fecha;
            return new Date(ultimoB || 0) - new Date(ultimoA || 0);
        });
        
    } catch (error) {
        console.error('❌ Error en obtenerConversacionesUsuario:', error);
        return [];
    }
}

function obtenerOtroUsuarioConversacion(conversacion) {
    try {
        if (!conversacion || !currentUser) {
            return { nombre: 'Usuario desconocido', rol: '?' };
        }
        
        const otroUsuarioId = conversacion.usuario1_id === currentUser.id 
                             ? conversacion.usuario2_id 
                             : conversacion.usuario1_id;
        
        const usuario = usuarios.find(u => u.id === otroUsuarioId);
        return usuario || { nombre: 'Usuario desconocido', rol: '?' };
    } catch (error) {
        console.error('❌ Error en obtenerOtroUsuarioConversacion:', error);
        return { nombre: 'Usuario desconocido', rol: '?' };
    }
}

async function contarMensajesNoLeidos(conversacion) {
    try {
        if (!conversacion || !conversacion.mensajes || !Array.isArray(conversacion.mensajes)) {
            return 0;
        }
        
        return conversacion.mensajes.filter(m => 
            m && m.destinatario_id === currentUser.id && !m.leido
        ).length;
    } catch (error) {
        console.error('❌ Error en contarMensajesNoLeidos:', error);
        return 0;
    }
}

async function seleccionarConversacion(conversacionId) {
    try {
        const conversaciones = await obtenerConversacionesUsuario();
        conversacionActual = conversaciones.find(c => c.id === conversacionId);
        
        if (!conversacionActual) {
            console.warn('❌ Conversación no encontrada:', conversacionId);
            return;
        }
        
        // Marcar mensajes como leídos
        await marcarMensajesComoLeidos(conversacionActual);
        
        // Actualizar UI
        actualizarVistaChat();
        await actualizarListaConversaciones();
    } catch (error) {
        console.error('❌ Error en seleccionarConversacion:', error);
    }
}

function actualizarVistaChat() {
    try {
        const chatHeader = document.getElementById('chat-header');
        const messagesArea = document.getElementById('messages-area');
        const messageInput = document.getElementById('message-input-container');
        
        if (!chatHeader || !messagesArea || !messageInput) {
            console.error('❌ Elementos del chat no encontrados');
            return;
        }
        
        if (!conversacionActual) {
            chatHeader.innerHTML = '<div class="no-chat-selected"><p>Selecciona una conversación para empezar a chatear</p></div>';
            messagesArea.innerHTML = '<div class="no-messages"><p>No hay mensajes seleccionados</p></div>';
            messageInput.style.display = 'none';
            return;
        }
        
        const otroUsuario = obtenerOtroUsuarioConversacion(conversacionActual);
        
        // Actualizar header
        chatHeader.innerHTML = `
            <div class="chat-user-info">
                <div class="user-avatar">${otroUsuario.nombre.charAt(0)}</div>
                <div>
                    <strong>${otroUsuario.nombre}</strong>
                    <div class="user-role">${otroUsuario.rol}</div>
                </div>
            </div>
        `;
        
        // Actualizar mensajes
        messagesArea.innerHTML = generarMensajesChat();
        messagesArea.scrollTop = messagesArea.scrollHeight;
        
        // Mostrar input
        messageInput.style.display = 'block';
    } catch (error) {
        console.error('❌ Error en actualizarVistaChat:', error);
    }
}

function generarMensajesChat() {
    try {
        if (!conversacionActual || !conversacionActual.mensajes || !Array.isArray(conversacionActual.mensajes)) {
            return '<div class="no-messages-chat"><p>No hay mensajes en esta conversación</p></div>';
        }
        
        if (conversacionActual.mensajes.length === 0) {
            return '<div class="no-messages-chat"><p>No hay mensajes en esta conversación</p></div>';
        }
        
        return conversacionActual.mensajes.map(mensaje => {
            try {
                const esMio = mensaje.remitente_id === currentUser.id;
                const usuario = usuarios.find(u => u.id === mensaje.remitente_id);
                
                return `
                    <div class="message ${esMio ? 'own-message' : 'other-message'}">
                        <div class="message-content">
                            <div class="message-text">${mensaje.texto || ''}</div>
                            <div class="message-time">
                                ${formatearHora(mensaje.fecha)}
                                ${esMio && mensaje.leido ? '✓✓' : ''}
                            </div>
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('❌ Error generando mensaje:', mensaje, error);
                return '';
            }
        }).join('');
    } catch (error) {
        console.error('❌ Error en generarMensajesChat:', error);
        return '<div class="no-messages-chat"><p>Error al cargar mensajes</p></div>';
    }
}

async function enviarMensaje() {
    try {
        const messageText = document.getElementById('message-text');
        if (!messageText) {
            console.error('❌ Campo de mensaje no encontrado');
            return;
        }
        
        const texto = messageText.value.trim();
        
        if (!texto || !conversacionActual) return;
        
        const otroUsuario = obtenerOtroUsuarioConversacion(conversacionActual);
        
        // Enviar a la API
        const response = await fetch(`${API_BASE}/messages.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'send',
                remitente_id: currentUser.id,
                destinatario_id: otroUsuario.id,
                texto: texto
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Agregar mensaje a la conversación actual
            const nuevoMensaje = result.mensaje || {
                id: mensajes.length > 0 ? Math.max(...mensajes.map(m => m.id)) + 1 : 1,
                remitente_id: currentUser.id,
                destinatario_id: otroUsuario.id,
                texto: texto,
                fecha: new Date().toISOString(),
                leido: false
            };
            
            // Agregar a arrays globales
            mensajes.push(nuevoMensaje);
            
            if (!conversacionActual.mensajes) {
                conversacionActual.mensajes = [];
            }
            conversacionActual.mensajes.push(nuevoMensaje);
            
            // Sincronizar
            await sincronizarCambio('mensaje', {
                mensaje_new: {
                    remitente_id: currentUser.id,
                    destinatario_id: otroUsuario.id,
                    texto: texto
                }
            });
            
            // Limpiar input y actualizar UI
            messageText.value = '';
            actualizarVistaChat();
            await actualizarListaConversaciones();
            
            // Notificar al destinatario
            if (typeof crearNotificacion === 'function') {
                crearNotificacion(
                    otroUsuario.id,
                    'Nuevo mensaje',
                    `${currentUser.nombre} te envió un mensaje`
                );
            }
        } else {
            alert('Error al enviar el mensaje: ' + result.message);
        }
    } catch (error) {
        console.error('❌ Error en enviarMensaje:', error);
        alert('Error de conexión al enviar mensaje');
    }
}

function manejarEnter(event) {
    try {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            enviarMensaje();
        }
    } catch (error) {
        console.error('❌ Error en manejarEnter:', error);
    }
}

function mostrarModalNuevoMensaje() {
    try {
        const modal = document.getElementById('new-message-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    } catch (error) {
        console.error('❌ Error en mostrarModalNuevoMensaje:', error);
    }
}

function cerrarModalNuevoMensaje() {
    try {
        const modal = document.getElementById('new-message-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    } catch (error) {
        console.error('❌ Error en cerrarModalNuevoMensaje:', error);
    }
}

function generarOpcionesUsuarios() {
    try {
        if (!usuarios || !Array.isArray(usuarios)) {
            return '<option value="">No hay usuarios disponibles</option>';
        }
        
        // Excluir al usuario actual
        return usuarios
            .filter(u => u && u.id !== currentUser.id)
            .map(u => `<option value="${u.id}">${u.nombre} (${u.rol})</option>`)
            .join('');
    } catch (error) {
        console.error('❌ Error en generarOpcionesUsuarios:', error);
        return '<option value="">Error al cargar usuarios</option>';
    }
}

async function crearNuevaConversacion() {
    try {
        const recipientSelect = document.getElementById('message-recipient');
        const messageTextarea = document.getElementById('new-message-text');
        
        if (!recipientSelect || !messageTextarea) {
            alert('Error: elementos del formulario no encontrados');
            return;
        }
        
        const recipientId = parseInt(recipientSelect.value);
        const messageText = messageTextarea.value.trim();
        
        if (!recipientId || !messageText) {
            alert('Por favor selecciona un destinatario y escribe un mensaje');
            return;
        }
        
        // Enviar mensaje a la API
        const response = await fetch(`${API_BASE}/messages.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'send',
                remitente_id: currentUser.id,
                destinatario_id: recipientId,
                texto: messageText
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Agregar a arrays globales
            if (result.mensaje) {
                mensajes.push(result.mensaje);
            }
            
            // Cerrar modal y recargar
            cerrarModalNuevoMensaje();
            await cargarPaginaMensajes();
            
            // Notificar al destinatario
            if (typeof crearNotificacion === 'function') {
                crearNotificacion(
                    recipientId,
                    'Nuevo mensaje',
                    `${currentUser.nombre} te envió un mensaje`
                );
            }
            
            alert('Mensaje enviado correctamente');
        } else {
            alert('Error al enviar el mensaje: ' + result.message);
        }
    } catch (error) {
        console.error('❌ Error en crearNuevaConversacion:', error);
        alert('Error de conexión al enviar mensaje');
    }
}

function buscarUsuarios(query) {
    try {
        const conversationsContainer = document.getElementById('conversations-container');
        if (!conversationsContainer) return;
        
        if (!query.trim()) {
            // Recargar conversaciones normales
            cargarPaginaMensajes();
            return;
        }
        
        if (!usuarios || !Array.isArray(usuarios)) {
            conversationsContainer.innerHTML = '<div class="no-conversations"><p>No se encontraron usuarios</p></div>';
            return;
        }
        
        const usuariosFiltrados = usuarios.filter(u => 
            u && u.id !== currentUser.id &&
            u.nombre && u.nombre.toLowerCase().includes(query.toLowerCase())
        );
        
        if (usuariosFiltrados.length === 0) {
            conversationsContainer.innerHTML = '<div class="no-conversations"><p>No se encontraron usuarios</p></div>';
            return;
        }
        
        conversationsContainer.innerHTML = usuariosFiltrados.map(usuario => {
            return `
                <div class="conversation-item" onclick="iniciarConversacionConUsuario(${usuario.id})">
                    <div class="conversation-avatar">${usuario.nombre.charAt(0)}</div>
                    <div class="conversation-info">
                        <div class="conversation-header">
                            <strong>${usuario.nombre}</strong>
                        </div>
                        <p class="conversation-preview">${usuario.rol} - Haz clic para iniciar conversación</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('❌ Error en buscarUsuarios:', error);
    }
}

async function iniciarConversacionConUsuario(usuarioId) {
    try {
        // Buscar si ya existe una conversación
        const conversaciones = await obtenerConversacionesUsuario();
        const conversacionExistente = conversaciones.find(c => 
            c.usuario1_id === usuarioId || c.usuario2_id === usuarioId
        );
        
        if (conversacionExistente) {
            await seleccionarConversacion(conversacionExistente.id);
        } else {
            // Crear nueva conversación vacía
            const nuevaConversacionId = [currentUser.id, usuarioId].sort().join('_');
            const conversacion = {
                id: nuevaConversacionId,
                usuario1_id: currentUser.id,
                usuario2_id: usuarioId,
                mensajes: []
            };
            
            conversacionActual = conversacion;
            actualizarVistaChat();
            
            // Limpiar búsqueda
            const searchInput = document.getElementById('search-users');
            if (searchInput) searchInput.value = '';
            await actualizarListaConversaciones();
        }
    } catch (error) {
        console.error('❌ Error en iniciarConversacionConUsuario:', error);
    }
}

async function marcarMensajesComoLeidos(conversacion) {
    try {
        if (!conversacion || !conversacion.mensajes || !Array.isArray(conversacion.mensajes)) {
            return;
        }
        
        const otroUsuario = obtenerOtroUsuarioConversacion(conversacion);
        let actualizado = false;
        
        // Marcar localmente
        conversacion.mensajes.forEach(mensaje => {
            if (mensaje.destinatario_id === currentUser.id && !mensaje.leido) {
                mensaje.leido = true;
                actualizado = true;
            }
        });
        
        // Actualizar en la API
        if (actualizado && otroUsuario) {
            await fetch(`${API_BASE}/messages.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'mark_read',
                    destinatario_id: currentUser.id,
                    remitente_id: otroUsuario.id
                })
            });
        }
    } catch (error) {
        console.error('❌ Error en marcarMensajesComoLeidos:', error);
    }
}

async function actualizarListaConversaciones() {
    try {
        const container = document.getElementById('conversations-container');
        if (container) {
            container.innerHTML = await generarListaConversaciones();
        }
    } catch (error) {
        console.error('❌ Error en actualizarListaConversaciones:', error);
    }
}

function iniciarPollingMensajes() {
    try {
        // Detener cualquier polling anterior
        if (intervaloMensajes) {
            clearInterval(intervaloMensajes);
        }
        
        // Iniciar nuevo polling
        intervaloMensajes = setInterval(async () => {
            try {
                if (conversacionActual) {
                    // Recargar mensajes de la conversación actual
                    const conversacionesActualizadas = await obtenerConversacionesUsuario();
                    const conversacionActualizada = conversacionesActualizadas.find(c => c.id === conversacionActual.id);
                    
                    if (conversacionActualizada && 
                        conversacionActualizada.mensajes.length !== conversacionActual.mensajes.length) {
                        conversacionActual.mensajes = conversacionActualizada.mensajes;
                        actualizarVistaChat();
                    }
                }
                await actualizarListaConversaciones();
            } catch (error) {
                console.error('❌ Error en polling de mensajes:', error);
            }
        }, 5000);
    } catch (error) {
        console.error('❌ Error en iniciarPollingMensajes:', error);
    }
}

// Función auxiliar para formatear hora
function formatearHora(fechaString) {
    try {
        if (!fechaString) return '';
        const fecha = new Date(fechaString);
        return fecha.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } catch (error) {
        return '';
    }
}

// Limpiar intervalo cuando se cambie de página
window.addEventListener('beforeunload', () => {
    if (intervaloMensajes) {
        clearInterval(intervaloMensajes);
    }
});