// sistema_voluntariado/js/achievement.js - MODIFICADO PARA MYSQL

async function verificarLogrosHoras(usuarioId) {
    try {
        // Llamar a la API para verificar logros por horas
        let response = await fetch(`${API_BASE}achievements.php?action=check_hours_achievement&user_id=${usuarioId}`);
        let result = await response.json();
        
        if (result.success) {
            console.log(`Horas totales del usuario ${usuarioId}: ${result.horas_totales}`);
            // Los logros ya se otorgaron automáticamente en el servidor
            
            // Recargar logros del usuario
            await cargarLogrosUsuario(usuarioId);
        }
    } catch (error) {
        console.error('Error verificando logros por horas:', error);
        
        // Fallback: cálculo local
        const horasTotales = tareas
            .filter(t => t.usuario_id === usuarioId && t.estado === 'verificada')
            .reduce((total, t) => total + t.horas_trabajadas, 0);
        
        // Verificar logro de 50 horas
        if (horasTotales >= 50 && !tieneLogro(usuarioId, 4)) {
            await otorgarLogro(usuarioId, 4);
        }
        
        // Verificar logro de 100 horas
        if (horasTotales >= 100 && !tieneLogro(usuarioId, 5)) {
            await otorgarLogro(usuarioId, 5);
        }
    }
}

async function otorgarLogro(usuarioId, logroId) {
    let logro = logrosPredefinidos.find(l => l.id === logroId);
    if (!logro) return;
    
    try {
        const response = await fetch(`${API_BASE}achievements.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'grant',
                usuario_id: usuarioId,
                logro_id: logroId,
                nombre: logro.nombre,
                insignia: logro.insignia,
                otorgado_por: 'sistema'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Agregar localmente
            const nuevoLogroUsuario = {
                id: logros.length > 0 ? Math.max(...logros.map(l => l.id)) + 1 : 1,
                usuario_id: usuarioId,
                logro_id: logroId,
                nombre: logro.nombre,
                insignia: logro.insignia,
                tipo: logro.tipo,
                fecha_otorgamiento: new Date().toISOString(),
                otorgado_por: 'sistema'
            };
            
            logros.push(nuevoLogroUsuario);
            
            // Sincronizar
            await sincronizarCambio('logro', {
                logro_new: {
                    usuario_id: usuarioId,
                    logro_id: logroId,
                    nombre: logro.nombre,
                    insignia: logro.insignia,
                    tipo: 'automatico',
                    otorgado_por: 'sistema'
                }
            });
            
            // Notificar al usuario
            if (typeof crearNotificacion === 'function') {
                crearNotificacion(usuarioId, '¡Nuevo logro desbloqueado!', 
                    `Has obtenido el logro "${logro.nombre}" ${logro.insignia}`);
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error otorgando logro:', error);
        return false;
    }
}

async function otorgarLogroManual(usuarioId, nombre, insignia, otorgadoPor) {
    try {
        const response = await fetch(`${API_BASE}achievements.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'grant',
                usuario_id: usuarioId,
                logro_id: null,
                nombre: nombre,
                insignia: insignia,
                otorgado_por: otorgadoPor
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Agregar localmente
            const nuevoLogro = {
                id: logros.length > 0 ? Math.max(...logros.map(l => l.id)) + 1 : 1,
                usuario_id: usuarioId,
                logro_id: null,
                nombre: nombre,
                insignia: insignia,
                tipo: 'manual',
                fecha_otorgamiento: new Date().toISOString(),
                otorgado_por: otorgadoPor
            };
            
            logros.push(nuevoLogro);
            
            // Sincronizar
            await sincronizarCambio('logro', {
                logro_new: {
                    usuario_id: usuarioId,
                    logro_id: null,
                    nombre: nombre,
                    insignia: insignia,
                    tipo: 'manual',
                    otorgado_por: otorgadoPor
                }
            });
            
            // Notificar al usuario
            if (typeof crearNotificacion === 'function') {
                crearNotificacion(usuarioId, 'Reconocimiento especial', 
                    `Has recibido un reconocimiento especial: ${nombre} ${insignia}`);
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error otorgando logro manual:', error);
        return false;
    }
}

function tieneLogro(usuarioId, logroId) {
    return logros.some(l => l.usuario_id === usuarioId && l.logro_id === logroId);
}

async function obtenerLogrosUsuario(usuarioId) {
    try {
        const response = await fetch(`${API_BASE}achievements.php?action=get_by_user&user_id=${usuarioId}`);
        const logrosUsuario = await response.json();
        return logrosUsuario;
    } catch (error) {
        console.error('Error obteniendo logros de usuario:', error);
        return logros.filter(l => l.usuario_id === usuarioId);
    }
}

async function cargarLogrosUsuario(usuarioId) {
    try {
        let response = await fetch(`${API_BASE}achievements.php?action=get_by_user&user_id=${usuarioId}`);
        let logrosUsuario = await response.json();
        
        // Actualizar logros globales (mantener otros logros)
        let otrosLogros = logros.filter(l => l.usuario_id !== usuarioId);
        logros = [...otrosLogros, ...logrosUsuario];
        
        return logrosUsuario;
    } catch (error) {
        console.error('Error cargando logros de usuario:', error);
        return [];
    }
}

async function crearNotificacion(usuarioId, titulo, mensaje) {
    const usuario = usuarios.find(u => u.id === usuarioId);
    if (!usuario || (usuario.notificaciones === undefined || !usuario.notificaciones)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}notifications.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create',
                usuario_id: usuarioId,
                titulo: titulo,
                mensaje: mensaje
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Agregar localmente
            const nuevaNotificacion = {
                id: notificaciones.length > 0 ? Math.max(...notificaciones.map(n => n.id)) + 1 : 1,
                usuario_id: usuarioId,
                titulo: titulo,
                mensaje: mensaje,
                fecha: new Date().toISOString(),
                leida: false
            };
            
            notificaciones.push(nuevaNotificacion);
            
            // Sincronizar
            await sincronizarCambio('notificacion', {
                notificacion_new: {
                    usuario_id: usuarioId,
                    titulo: titulo,
                    mensaje: mensaje
                }
            });
            
            console.log(`Notificación para ${usuario.email}: ${titulo} - ${mensaje}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error creando notificación:', error);
        return false;
    }
}

async function obtenerNotificacionesUsuario(usuarioId) {
    try {
        const response = await fetch(`${API_BASE}notifications.php?action=get_user&user_id=${usuarioId}`);
        const notificacionesUsuario = await response.json();
        
        // Actualizar array global
        const otrasNotificaciones = notificaciones.filter(n => n.usuario_id !== usuarioId);
        notificaciones = [...otrasNotificaciones, ...notificacionesUsuario];
        
        return notificacionesUsuario.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    } catch (error) {
        console.error('Error obteniendo notificaciones:', error);
        return notificaciones
            .filter(n => n.usuario_id === usuarioId)
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }
}

async function marcarNotificacionLeida(notificacionId) {
    const notificacion = notificaciones.find(n => n.id === notificacionId);
    if (!notificacion) return;
    
    try {
        const response = await fetch(`${API_BASE}notifications.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'mark_read',
                id: notificacionId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            notificacion.leida = true;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error marcando notificación como leída:', error);
        notificacion.leida = true; // Marcar localmente aunque falle
        return false;
    }
}

async function cargarNotificacionesUsuario(usuarioId) {
    return await obtenerNotificacionesUsuario(usuarioId);
}