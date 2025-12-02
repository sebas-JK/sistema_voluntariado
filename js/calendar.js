// sistema_voluntariado/js/calendar.js - VERSIÓN CORREGIDA

// Configuración inicial
if (typeof window.campanias === 'undefined') window.campanias = [];
if (typeof window.currentMonth === 'undefined') window.currentMonth = new Date().getMonth();
if (typeof window.currentYear === 'undefined') window.currentYear = new Date().getFullYear();

async function generateCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;
    
    calendarGrid.innerHTML = '<div class="loading-calendar">Cargando calendario...</div>';
    
    try {
        // Cargar campañas para el mes actual
        const hoy = new Date();
        const primerDiaMes = new Date(window.currentYear, window.currentMonth, 1);
        const ultimoDiaMes = new Date(window.currentYear, window.currentMonth + 1, 0);
        
        // Usar campañas ya cargadas en memoria
        const todasCampanias = window.campanias || [];
        
        // Filtrar campañas del mes actual
        const campaniasMes = todasCampanias.filter(campania => {
            if (!campania || !campania.fecha) return false;
            const fechaCampania = new Date(campania.fecha);
            return fechaCampania.getMonth() === window.currentMonth && 
                   fechaCampania.getFullYear() === window.currentYear;
        });
        
        console.log(`📅 ${campaniasMes.length} campañas para ${window.currentMonth}/${window.currentYear}`);
        
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
    const firstDay = new Date(window.currentYear, window.currentMonth, 1);
    const lastDay = new Date(window.currentYear, window.currentMonth + 1, 0);
    
    // Días del mes anterior para completar la primera semana
    const prevMonthLastDay = new Date(window.currentYear, window.currentMonth, 0).getDate();
    const startingDay = firstDay.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    
    // Actualizar el título del mes
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    document.getElementById('current-month').textContent = `${monthNames[window.currentMonth]} ${window.currentYear}`;
    
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
        if (day === today.getDate() && window.currentMonth === today.getMonth() && window.currentYear === today.getFullYear()) {
            dayElement.classList.add('today');
        }
        
        dayElement.textContent = day;
        
        // Agregar eventos (campañas) para este día
        const dayEvents = campaniasMes.filter(campania => {
            const campaniaDate = new Date(campania.fecha);
            return campaniaDate.getDate() === day && 
                   campaniaDate.getMonth() === window.currentMonth && 
                   campaniaDate.getFullYear() === window.currentYear;
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
    window.currentMonth += direction;
    
    if (window.currentMonth > 11) {
        window.currentMonth = 0;
        window.currentYear++;
    } else if (window.currentMonth < 0) {
        window.currentMonth = 11;
        window.currentYear--;
    }
    
    generateCalendar();
}