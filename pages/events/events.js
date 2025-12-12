// ==========================================
// Eventos do Calendário
// ==========================================

// Estado local do módulo
let eventsData = [];
let ministriesData = [];
let editingEventId = null;

// Tipos de eventos
const eventTypes = {
    SERVICE: { label: 'Culto', icon: 'fa-church', color: 'primary' },
    EVENT: { label: 'Evento', icon: 'fa-calendar-star', color: 'success' },
    MEETING: { label: 'Reunião', icon: 'fa-users', color: 'warning' },
    REHEARSAL: { label: 'Ensaio', icon: 'fa-music', color: 'info' },
    OTHER: { label: 'Outro', icon: 'fa-calendar', color: 'gray' }
};

// Status de eventos
const eventStatuses = {
    SCHEDULED: { label: 'Agendado', color: 'primary' },
    COMPLETED: { label: 'Concluído', color: 'success' },
    CANCELED: { label: 'Cancelado', color: 'danger' }
};

/**
 * Carrega a página de eventos
 * @param {HTMLElement} container - Container onde o conteúdo será renderizado
 */
async function loadEvents(container) {
    container.innerHTML = `
        <div class="dashboard-loading">
            <div class="spinner"></div>
            <p>Carregando eventos...</p>
        </div>
    `;
    
    try {
        const [events, ministries] = await Promise.all([
            apiRequest('GET', '/calendar-events'),
            apiRequest('GET', '/ministries').catch(() => [])
        ]);
        
        eventsData = events || [];
        ministriesData = ministries || [];
        
        container.innerHTML = renderEventsPage(eventsData);
        setupEventEventListeners();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Erro ao carregar eventos</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadSectionContent('events')">
                    <i class="fas fa-refresh"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

/**
 * Renderiza a página de eventos
 * @param {array} events - Lista de eventos
 * @returns {string} HTML da página
 */
function renderEventsPage(events) {
    // Separar eventos por status
    const upcoming = events.filter(e => e.status !== 'CANCELED' && new Date(e.startDatetime) >= new Date());
    const past = events.filter(e => e.status !== 'CANCELED' && new Date(e.startDatetime) < new Date());
    const canceled = events.filter(e => e.status === 'CANCELED');
    
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Eventos do Calendário</h2>
                <p>Gerencie os eventos da igreja</p>
            </div>
            <button class="btn btn-primary" onclick="openEventModal()">
                <i class="fas fa-plus"></i>
                Novo Evento
            </button>
        </div>
        
        <!-- Contadores -->
        <div class="events-counters">
            <div class="counter-card upcoming">
                <i class="fas fa-calendar-check"></i>
                <div>
                    <span class="value">${upcoming.length}</span>
                    <span class="label">Próximos</span>
                </div>
            </div>
            <div class="counter-card past">
                <i class="fas fa-calendar-minus"></i>
                <div>
                    <span class="value">${past.length}</span>
                    <span class="label">Realizados</span>
                </div>
            </div>
            <div class="counter-card canceled">
                <i class="fas fa-calendar-xmark"></i>
                <div>
                    <span class="value">${canceled.length}</span>
                    <span class="label">Cancelados</span>
                </div>
            </div>
        </div>
        
        <!-- Lista de Eventos -->
        <div class="events-section">
            <h3><i class="fas fa-calendar-days"></i> Próximos Eventos</h3>
            ${renderEventsList(upcoming.sort((a, b) => new Date(a.startDatetime) - new Date(b.startDatetime)))}
        </div>
        
        ${past.length > 0 ? `
            <div class="events-section collapsed">
                <h3 onclick="toggleEventsSection(this)">
                    <i class="fas fa-history"></i> Eventos Realizados
                    <i class="fas fa-chevron-down toggle-icon"></i>
                </h3>
                <div class="events-section-content">
                    ${renderEventsList(past.sort((a, b) => new Date(b.startDatetime) - new Date(a.startDatetime)))}
                </div>
            </div>
        ` : ''}
        
        ${canceled.length > 0 ? `
            <div class="events-section collapsed">
                <h3 onclick="toggleEventsSection(this)">
                    <i class="fas fa-ban"></i> Eventos Cancelados
                    <i class="fas fa-chevron-down toggle-icon"></i>
                </h3>
                <div class="events-section-content">
                    ${renderEventsList(canceled)}
                </div>
            </div>
        ` : ''}
        
        ${renderEventModal()}
    `;
}

/**
 * Renderiza a lista de eventos
 * @param {array} events - Lista de eventos
 * @returns {string} HTML da lista
 */
function renderEventsList(events) {
    if (events.length === 0) {
        return `
            <div class="empty-list">
                <i class="fas fa-calendar"></i>
                <p>Nenhum evento encontrado</p>
            </div>
        `;
    }
    
    return `
        <div class="events-list">
            ${events.map(event => {
                const typeInfo = eventTypes[event.type] || eventTypes.OTHER;
                const statusInfo = eventStatuses[event.status] || eventStatuses.SCHEDULED;
                const startDate = new Date(event.startDatetime);
                const endDate = new Date(event.endDatetime);
                
                return `
                    <div class="event-card ${typeInfo.color}">
                        <div class="event-date">
                            <span class="day">${startDate.getDate()}</span>
                            <span class="month">${getMonthShort(startDate.getMonth())}</span>
                            <span class="year">${startDate.getFullYear()}</span>
                        </div>
                        <div class="event-info">
                            <div class="event-header">
                                <h4>${event.title}</h4>
                                <span class="event-type-badge ${typeInfo.color}">
                                    <i class="fas ${typeInfo.icon}"></i>
                                    ${typeInfo.label}
                                </span>
                            </div>
                            <div class="event-meta">
                                <span class="event-time">
                                    <i class="fas fa-clock"></i>
                                    ${formatTime(startDate)} - ${formatTime(endDate)}
                                </span>
                                ${event.location ? `
                                    <span class="event-location">
                                        <i class="fas fa-map-marker-alt"></i>
                                        ${event.location}
                                    </span>
                                ` : ''}
                                ${event.ministry ? `
                                    <span class="event-ministry">
                                        <i class="fas fa-hands-praying"></i>
                                        ${event.ministry.name}
                                    </span>
                                ` : ''}
                            </div>
                            ${event.description ? `
                                <p class="event-description">${event.description}</p>
                            ` : ''}
                        </div>
                        <div class="event-actions">
                            <span class="status-badge ${statusInfo.color}">${statusInfo.label}</span>
                            <div class="action-buttons">
                                <button class="btn-icon" onclick="editEvent('${event.id}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                ${event.status !== 'CANCELED' ? `
                                    <button class="btn-icon" onclick="cancelEvent('${event.id}')" title="Cancelar">
                                        <i class="fas fa-ban"></i>
                                    </button>
                                ` : ''}
                                <button class="btn-icon danger" onclick="deleteEvent('${event.id}')" title="Excluir">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Renderiza o modal de evento
 * @returns {string} HTML do modal
 */
function renderEventModal() {
    return `
        <div id="event-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeEventModal()"></div>
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3 id="event-modal-title">Novo Evento</h3>
                    <button class="modal-close" onclick="closeEventModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="event-form" class="modal-body">
                    <div class="form-group">
                        <label for="event-title">Título *</label>
                        <input type="text" id="event-title" placeholder="Nome do evento" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="event-type">Tipo *</label>
                            <select id="event-type" required>
                                <option value="">Selecione</option>
                                <option value="SERVICE">Culto</option>
                                <option value="EVENT">Evento</option>
                                <option value="MEETING">Reunião</option>
                                <option value="REHEARSAL">Ensaio</option>
                                <option value="OTHER">Outro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="event-ministry">Ministério (opcional)</label>
                            <select id="event-ministry">
                                <option value="">Nenhum</option>
                                ${ministriesData.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="event-start">Início *</label>
                            <input type="datetime-local" id="event-start" required>
                        </div>
                        <div class="form-group">
                            <label for="event-end">Término *</label>
                            <input type="datetime-local" id="event-end" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="event-location">Local</label>
                        <input type="text" id="event-location" placeholder="Ex: Templo Principal">
                    </div>
                    
                    <div class="form-group">
                        <label for="event-description">Descrição</label>
                        <textarea id="event-description" rows="2" placeholder="Detalhes do evento..."></textarea>
                    </div>
                    
                    <div class="form-group" id="event-status-group" style="display: none;">
                        <label for="event-status">Status</label>
                        <select id="event-status">
                            <option value="SCHEDULED">Agendado</option>
                            <option value="COMPLETED">Concluído</option>
                            <option value="CANCELED">Cancelado</option>
                        </select>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeEventModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

/**
 * Configura os event listeners
 */
function setupEventEventListeners() {
    const form = document.getElementById('event-form');
    if (form) {
        form.addEventListener('submit', handleEventSubmit);
    }
}

/**
 * Abre o modal de evento
 * @param {string|null} eventId - ID do evento para edição ou null para novo
 */
function openEventModal(eventId = null) {
    editingEventId = eventId;
    const modal = document.getElementById('event-modal');
    const title = document.getElementById('event-modal-title');
    const form = document.getElementById('event-form');
    const statusGroup = document.getElementById('event-status-group');
    
    form.reset();
    statusGroup.style.display = 'none';
    
    // Data/hora padrão: próxima hora cheia
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 horas
    
    document.getElementById('event-start').value = formatDateTimeLocal(now);
    document.getElementById('event-end').value = formatDateTimeLocal(end);
    
    if (eventId) {
        title.textContent = 'Editar Evento';
        statusGroup.style.display = 'block';
        const event = eventsData.find(e => e.id === eventId);
        if (event) {
            document.getElementById('event-title').value = event.title;
            document.getElementById('event-type').value = event.type;
            document.getElementById('event-ministry').value = event.ministryId || '';
            document.getElementById('event-start').value = formatDateTimeLocal(new Date(event.startDatetime));
            document.getElementById('event-end').value = formatDateTimeLocal(new Date(event.endDatetime));
            document.getElementById('event-location').value = event.location || '';
            document.getElementById('event-description').value = event.description || '';
            document.getElementById('event-status').value = event.status || 'SCHEDULED';
        }
    } else {
        title.textContent = 'Novo Evento';
    }
    
    modal.classList.remove('hidden');
}

/**
 * Fecha o modal de evento
 */
function closeEventModal() {
    const modal = document.getElementById('event-modal');
    modal.classList.add('hidden');
    editingEventId = null;
}

/**
 * Manipula o envio do formulário de evento
 * @param {Event} e - Evento do formulário
 */
async function handleEventSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('event-title').value;
    const type = document.getElementById('event-type').value;
    const ministryId = document.getElementById('event-ministry').value || null;
    const startDatetime = new Date(document.getElementById('event-start').value).toISOString();
    const endDatetime = new Date(document.getElementById('event-end').value).toISOString();
    const location = document.getElementById('event-location').value;
    const description = document.getElementById('event-description').value;
    const status = document.getElementById('event-status').value;
    
    const data = {
        churchId: AppState.church?.id,
        title,
        type,
        ministryId,
        startDatetime,
        endDatetime,
        location,
        description,
        createdByUserId: AppState.user?.id
    };
    
    showLoading();
    
    try {
        if (editingEventId) {
            await apiRequest('PUT', `/calendar-events/${editingEventId}`, {
                title,
                type,
                ministryId,
                startDatetime,
                endDatetime,
                location,
                description,
                status
            });
            showToast('success', 'Evento atualizado!', 'O evento foi atualizado com sucesso.');
        } else {
            await apiRequest('POST', '/calendar-events', data);
            showToast('success', 'Evento criado!', 'O novo evento foi agendado.');
        }
        
        closeEventModal();
        await loadSectionContent('events');
        
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível salvar o evento.');
    } finally {
        hideLoading();
    }
}

/**
 * Abre o modal para editar um evento
 * @param {string} eventId - ID do evento
 */
function editEvent(eventId) {
    openEventModal(eventId);
}

/**
 * Cancela um evento
 * @param {string} eventId - ID do evento
 */
async function cancelEvent(eventId) {
    if (!confirm('Deseja cancelar este evento?')) {
        return;
    }
    
    showLoading();
    
    try {
        await apiRequest('PUT', `/calendar-events/${eventId}`, { status: 'CANCELED' });
        showToast('success', 'Evento cancelado!', 'O evento foi marcado como cancelado.');
        await loadSectionContent('events');
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível cancelar o evento.');
    } finally {
        hideLoading();
    }
}

/**
 * Exclui um evento
 * @param {string} eventId - ID do evento
 */
async function deleteEvent(eventId) {
    if (!confirm('Deseja realmente excluir este evento?')) {
        return;
    }
    
    showLoading();
    
    try {
        await apiRequest('DELETE', `/calendar-events/${eventId}`);
        showToast('success', 'Evento excluído!', 'O evento foi removido.');
        await loadSectionContent('events');
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível excluir o evento.');
    } finally {
        hideLoading();
    }
}

/**
 * Toggle da seção de eventos (expandir/colapsar)
 * @param {HTMLElement} header - Elemento do header clicado
 */
function toggleEventsSection(header) {
    const section = header.closest('.events-section');
    section.classList.toggle('collapsed');
}

// Exportar para uso global
window.loadEvents = loadEvents;
window.renderEventsPage = renderEventsPage;
window.renderEventsList = renderEventsList;
window.renderEventModal = renderEventModal;
window.setupEventEventListeners = setupEventEventListeners;
window.openEventModal = openEventModal;
window.closeEventModal = closeEventModal;
window.handleEventSubmit = handleEventSubmit;
window.editEvent = editEvent;
window.cancelEvent = cancelEvent;
window.deleteEvent = deleteEvent;
window.toggleEventsSection = toggleEventsSection;
window.eventTypes = eventTypes;
window.eventStatuses = eventStatuses;

