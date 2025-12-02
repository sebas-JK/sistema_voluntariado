// sistema_voluntariado/js/tasks.js - MODIFICADO PARA MYSQL

async function asignarTarea(campaniaId, voluntarioId, descripcion) {
    try {
        const response = await fetch(`${API_BASE}/tasks.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'assign',
                campania_id: campaniaId,
                usuario_id: voluntarioId,
                descripcion: descripcion
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Agregar localmente
            const nuevaTarea = {
                id: result.tarea ? result.tarea.id : (tareas.length > 0 ? Math.max(...tareas.map(t => t.id)) + 1 : 1),
                campania_id: campaniaId,
                usuario_id: voluntarioId,
                descripcion: descripcion,
                estado: 'pendiente',
                horas_trabajadas: 0,
                fecha_asignacion: new Date().toISOString(),
                fecha_completacion: null,
                fecha_verificacion: null
            };
            
            if (result.tarea) {
                Object.assign(nuevaTarea, result.tarea);
            }
            
            tareas.push(nuevaTarea);
            
            // Sincronizar
            await sincronizarCambio('tarea', {
                tarea_new: {
                    campania_id: campaniaId,
                    usuario_id: voluntarioId,
                    descripcion: descripcion
                }
            });
            
            // Notificar al voluntario
            if (typeof crearNotificacion === 'function') {
                crearNotificacion(voluntarioId, 'Nueva tarea asignada', 
                    `Se te ha asignado una nueva tarea: ${descripcion}`);
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error asignando tarea:', error);
        return false;
    }
}

async function completarTarea(tareaId) {
    const tarea = tareas.find(t => t.id === tareaId);
    if (!tarea || tarea.usuario_id !== currentUser.id) {
        return false;
    }
    
    try {
        const response = await fetch(`${API_BASE}/tasks.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'complete',
                id: tareaId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Actualizar localmente
            tarea.estado = 'completada';
            tarea.fecha_completacion = new Date().toISOString();
            
            // Sincronizar
            await sincronizarCambio('tarea', {
                tarea_update: {
                    id: tareaId,
                    estado: 'completada'
                }
            });
            
            // Notificar al coordinador
            const campania = campanias.find(c => c.id === tarea.campania_id);
            if (campania && typeof crearNotificacion === 'function') {
                crearNotificacion(campania.coordinador_id, 'Tarea completada', 
                    `El voluntario ha marcado como completada la tarea: ${tarea.descripcion}`);
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error completando tarea:', error);
        return false;
    }
}

async function verificarTarea(tareaId, horas) {
    const tarea = tareas.find(t => t.id === tareaId);
    if (!tarea) return false;
    
    try {
        const response = await fetch(`${API_BASE}/tasks.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'verify',
                id: tareaId,
                horas: horas
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Actualizar localmente
            tarea.estado = 'verificada';
            tarea.horas_trabajadas = horas;
            tarea.fecha_verificacion = new Date().toISOString();
            
            // Sincronizar
            await sincronizarCambio('tarea', {
                tarea_update: {
                    id: tareaId,
                    estado: 'verificada',
                    horas_trabajadas: horas
                }
            });
            
            // Notificar al voluntario
            if (typeof crearNotificacion === 'function') {
                crearNotificacion(tarea.usuario_id, 'Tarea verificada', 
                    `Tu tarea "${tarea.descripcion}" ha sido verificada. Horas registradas: ${horas}`);
            }
            
            // Verificar logros por horas
            if (typeof verificarLogrosHoras === 'function') {
                await verificarLogrosHoras(tarea.usuario_id);
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error verificando tarea:', error);
        return false;
    }
}

async function obtenerTareasUsuario(usuarioId) {
    try {
        const response = await fetch(`${API_BASE}/tasks.php?action=get_by_user&user_id=${usuarioId}`);
        const tareasUsuario = await response.json();
        return tareasUsuario;
    } catch (error) {
        console.error('Error obteniendo tareas de usuario:', error);
        return tareas.filter(t => t.usuario_id === usuarioId);
    }
}

async function obtenerTareasCampania(campaniaId) {
    try {
        const response = await fetch(`${API_BASE}/tasks.php?action=get_by_campaign&campaign_id=${campaniaId}`);
        const tareasCampania = await response.json();
        return tareasCampania;
    } catch (error) {
        console.error('Error obteniendo tareas de campaña:', error);
        return tareas.filter(t => t.campania_id === campaniaId);
    }
}

async function cargarTareasVerificadasUsuario(usuarioId) {
    try {
        const response = await fetch(`${API_BASE}/tasks.php?action=get_verified&user_id=${usuarioId}`);
        const tareasVerificadas = await response.json();
        return tareasVerificadas;
    } catch (error) {
        console.error('Error obteniendo tareas verificadas:', error);
        return tareas.filter(t => t.usuario_id === usuarioId && t.estado === 'verificada');
    }
}