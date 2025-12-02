// sistema_voluntariado/js/calendar.js - MODIFICADO PARA MYSQL

async function generateCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;
    
    calendarGrid.innerHTML = '<div class="loading-calendar">Cargando calendario...</div>';
    
    try {
        // Cargar campañas para el mes actual
        const hoy = new Date();
        const primerDiaMes = new Date(currentYear, currentMonth, 1);
        const ultimoDiaMes = new Date(currentYear, currentMonth + 1, 0);
        
        // Formatear fechas para la API
        const fechaInicio = primerDiaMes.toISOString().split('T')[0];
        const fechaFin = ultimoDiaMes.toISOString().split('T')[0];
        
        // En una implementación real, necesitarías un endpoint específico para campañas por rango de fechas
        // Por ahora, cargamos todas las campañas activas y filtramos localmente
        const response = await fetch(`${API_BASE}/campaigns.php?action=get_active`);
        const todasCampanias = await response.json();
        
        // Filtrar campañas del mes actual
        const campaniasMes = todasCampanias.filter(campania => {
            const fechaCampania = new Date(campania.fecha);
            return fechaCampania.getMonth() === currentMonth && 
                   fechaCampania.getFullYear() === currentYear;
        });
        
        // Actualizar array global
        campanias = campaniasMes;
        
        // Generar calendario
        generarCalendarioHTML(calendarGrid, campaniasMes);
        
    } catch (error) {
        console.error('Error generando calendario:', error);
        calendarGrid.innerHTML = '<div class="error">Error al cargar el calendario</div>';
    }
}

function generarCalendarioHTML(calendarGrid, campaniasMes) {
    calendarGrid.innerHTML = '';
    
    // Nombres de los días de la semana
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    // Encabezados de días
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Obtener primer día del mes y último día del mes
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // Días del mes anterior para completar la primera semana
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    const startingDay = firstDay.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    
    // Actualizar el título del mes
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    document.getElementById('current-month').textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    // Días del mes anterior
    for (let i = startingDay - 1; i >= 0; i--) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day other-month';
        dayElement.textContent = prevMonthLastDay - i;
        calendarGrid.appendChild(dayElement);
    }
    
    // Días del mes actual
    const today = new Date();
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        // Marcar si es hoy
        if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            dayElement.classList.add('today');
        }
        
        dayElement.textContent = day;
        
        // Agregar eventos (campañas) para este día
        const dayEvents = campaniasMes.filter(campania => {
            const campaniaDate = new Date(campania.fecha);
            return campaniaDate.getDate() === day && 
                   campaniaDate.getMonth() === currentMonth && 
                   campaniaDate.getFullYear() === currentYear;
        });
        
        dayEvents.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = 'calendar-event';
            eventElement.textContent = event.titulo;
            eventElement.title = `${event.titulo} - ${event.organizacion_nombre}`;
            eventElement.setAttribute('data-campaign-id', event.id);
            eventElement.addEventListener('click', function() {
                verDetallesCampania(parseInt(this.getAttribute('data-campaign-id')));
            });
            dayElement.appendChild(eventElement);
        });
        
        calendarGrid.appendChild(dayElement);
    }
    
    // Días del mes siguiente para completar la última semana
    const daysInGrid = 42; // 6 semanas * 7 días
    const totalDaysSoFar = startingDay + lastDay.getDate();
    const nextMonthDays = daysInGrid - totalDaysSoFar;
    
    for (let day = 1; day <= nextMonthDays; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day other-month';
        dayElement.textContent = day;
        calendarGrid.appendChild(dayElement);
    }
}

function changeMonth(direction) {
    currentMonth += direction;
    
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    
    generateCalendar();
}