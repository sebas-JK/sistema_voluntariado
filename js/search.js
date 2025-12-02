// sistema_voluntariado/js/search.js - MODIFICADO PARA MYSQL

function inicializarBusqueda() {
    try {
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');
        const dateFilter = document.getElementById('date-filter');
        const clearBtn = document.getElementById('clear-filters');

        if (searchBtn) {
            searchBtn.addEventListener('click', aplicarFiltros);
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') aplicarFiltros();
            });
        }
        
        if (dateFilter) {
            dateFilter.addEventListener('change', function() {
                const specificDate = document.getElementById('specific-date');
                if (specificDate) {
                    specificDate.style.display = this.value === 'specific' ? 'inline-block' : 'none';
                }
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', limpiarFiltros);
        }
        
        cargarFiltrosUbicacion();
        
        console.log('✅ Búsqueda inicializada correctamente');
    } catch (error) {
        console.error('❌ Error en inicializarBusqueda:', error);
    }
}

async function aplicarFiltros() {
    try {
        const searchInput = document.getElementById('search-input');
        const dateFilter = document.getElementById('date-filter');
        const specificDate = document.getElementById('specific-date');
        const locationFilter = document.getElementById('location-filter');

        const texto = searchInput ? searchInput.value.toLowerCase() : '';
        const filtroFecha = dateFilter ? dateFilter.value : '';
        const fechaEspecifica = specificDate ? specificDate.value : '';
        const ubicacion = locationFilter ? locationFilter.value : '';
        
        // Cargar campañas activas filtradas desde API
        let url = `${API_BASE}/campaigns.php?action=get_active`;
        const params = [];
        
        if (texto) {
            // Para búsqueda de texto, cargamos todas y filtramos localmente
            // En una implementación real, deberías tener un endpoint de búsqueda
        }
        
        if (ubicacion) {
            // Filtro por ubicación
        }
        
        const response = await fetch(url);
        let campaniasFiltradas = await response.json();
        
        // Aplicar filtros locales
        const hoy = new Date().toISOString().split('T')[0];
        campaniasFiltradas = campaniasFiltradas.filter(campania => {
            // Filtro por texto
            const coincideTexto = !texto || 
                                campania.titulo.toLowerCase().includes(texto) || 
                                campania.descripcion.toLowerCase().includes(texto);
            
            // Filtro por fecha
            let coincideFecha = true;
            if (filtroFecha === 'week') {
                const unaSemana = new Date();
                unaSemana.setDate(unaSemana.getDate() + 7);
                coincideFecha = new Date(campania.fecha) <= unaSemana;
            } else if (filtroFecha === 'month') {
                const unMes = new Date();
                unMes.setMonth(unMes.getMonth() + 1);
                coincideFecha = new Date(campania.fecha) <= unMes;
            } else if (filtroFecha === 'specific' && fechaEspecifica) {
                coincideFecha = campania.fecha === fechaEspecifica;
            }
            
            // Filtro por ubicación
            const coincideUbicacion = !ubicacion || campania.ubicacion === ubicacion;
            
            return coincideTexto && coincideFecha && coincideUbicacion;
        });
        
        mostrarCampaniasFiltradas(campaniasFiltradas);
    } catch (error) {
        console.error('❌ Error en aplicarFiltros:', error);
        // Fallback a filtrado local
        aplicarFiltrosLocal();
    }
}

function aplicarFiltrosLocal() {
    const searchInput = document.getElementById('search-input');
    const dateFilter = document.getElementById('date-filter');
    const specificDate = document.getElementById('specific-date');
    const locationFilter = document.getElementById('location-filter');

    const texto = searchInput ? searchInput.value.toLowerCase() : '';
    const filtroFecha = dateFilter ? dateFilter.value : '';
    const fechaEspecifica = specificDate ? specificDate.value : '';
    const ubicacion = locationFilter ? locationFilter.value : '';
    
    const hoy = new Date().toISOString().split('T')[0];
    const campaniasFiltradas = campanias.filter(campania => {
        // Filtro por texto
        const coincideTexto = !texto || 
                            campania.titulo.toLowerCase().includes(texto) || 
                            campania.descripcion.toLowerCase().includes(texto);
        
        // Filtro por fecha
        let coincideFecha = true;
        if (filtroFecha === 'week') {
            const unaSemana = new Date();
            unaSemana.setDate(unaSemana.getDate() + 7);
            coincideFecha = new Date(campania.fecha) <= unaSemana;
        } else if (filtroFecha === 'month') {
            const unMes = new Date();
            unMes.setMonth(unMes.getMonth() + 1);
            coincideFecha = new Date(campania.fecha) <= unMes;
        } else if (filtroFecha === 'specific' && fechaEspecifica) {
            coincideFecha = campania.fecha === fechaEspecifica;
        }
        
        // Filtro por ubicación
        const coincideUbicacion = !ubicacion || campania.ubicacion === ubicacion;
        
        return coincideTexto && coincideFecha && coincideUbicacion && 
               campania.estado === 'activa' && 
               campania.fecha >= hoy;
    });
    
    mostrarCampaniasFiltradas(campaniasFiltradas);
}

function cargarFiltrosUbicacion() {
    try {
        const select = document.getElementById('location-filter');
        if (!select) {
            console.warn('⚠️ location-filter no encontrado');
            return;
        }

        // Cargar ubicaciones únicas de las campañas
        const ubicaciones = [...new Set(campanias.map(c => c.ubicacion))].filter(Boolean);
        
        ubicaciones.forEach(ubicacion => {
            const option = document.createElement('option');
            option.value = ubicacion;
            option.textContent = ubicacion;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('❌ Error en cargarFiltrosUbicacion:', error);
    }
}

function mostrarCampaniasFiltradas(campaniasFiltradas) {
    try {
        const container = document.getElementById('campaigns-container');
        if (!container) {
            console.error('❌ campaigns-container no encontrado');
            return;
        }
        
        container.innerHTML = '';
        
        if (campaniasFiltradas.length === 0) {
            container.innerHTML = '<div class="no-campaigns"><p>No se encontraron campañas con los filtros aplicados.</p></div>';
            return;
        }
        
        campaniasFiltradas.forEach(campania => {
            const estaPostulado = postulaciones.some(p => 
                p.usuario_id === currentUser.id && p.campania_id === campania.id);
            
            const puedePostularse = currentUser.rol === 'voluntario' && 
                                   !estaPostulado && 
                                   campania.voluntarios_actuales < campania.max_voluntarios;

            const campaniaElement = document.createElement('div');
            campaniaElement.className = 'campaign-card';
            campaniaElement.innerHTML = `
                <div class="campaign-image" style="background-color: ${getRandomColor()}">${campania.titulo.charAt(0)}</div>
                <div class="campaign-content">
                    <h3 class="campaign-title">${campania.titulo}</h3>
                    <p class="campaign-description">${campania.descripcion}</p>
                    <div class="campaign-details">
                        <span><strong>Organización:</strong> ${campania.organizacion_nombre}</span>
                        <span><strong>Coordinador:</strong> ${campania.coordinador_nombre}</span>
                    </div>
                    <div class="campaign-details">
                        <span><strong>Fecha:</strong> ${formatearFecha(campania.fecha)} ${campania.hora}</span>
                        <span><strong>Ubicación:</strong> ${campania.ubicacion}</span>
                    </div>
                    <div class="campaign-details">
                        <span><strong>Voluntarios:</strong> ${campania.voluntarios_actuales}/${campania.max_voluntarios}</span>
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
            `;
            
            container.appendChild(campaniaElement);
        });

        // Asignar event listeners
        document.querySelectorAll('.apply-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (typeof aplicarACampania === 'function') {
                    aplicarACampania(parseInt(this.getAttribute('data-campaign-id')));
                }
            });
        });
        
        document.querySelectorAll('.details-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (typeof verDetallesCampania === 'function') {
                    verDetallesCampania(parseInt(this.getAttribute('data-campaign-id')));
                }
            });
        });

        document.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (typeof cancelarPostulacion === 'function') {
                    cancelarPostulacion(parseInt(this.getAttribute('data-campaign-id')));
                }
            });
        });
    } catch (error) {
        console.error('❌ Error en mostrarCampaniasFiltradas:', error);
    }
}

function limpiarFiltros() {
    try {
        const searchInput = document.getElementById('search-input');
        const dateFilter = document.getElementById('date-filter');
        const specificDate = document.getElementById('specific-date');
        const locationFilter = document.getElementById('location-filter');

        if (searchInput) searchInput.value = '';
        if (dateFilter) dateFilter.value = '';
        if (specificDate) {
            specificDate.value = '';
            specificDate.style.display = 'none';
        }
        if (locationFilter) locationFilter.value = '';
        
        if (typeof loadCampaigns === 'function') {
            loadCampaigns();
        }
    } catch (error) {
        console.error('❌ Error en limpiarFiltros:', error);
    }
}

function formatearFecha(fechaString) {
    try {
        if (!fechaString) return 'Fecha no definida';
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

function getRandomColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    return colors[Math.floor(Math.random() * colors.length)];
}