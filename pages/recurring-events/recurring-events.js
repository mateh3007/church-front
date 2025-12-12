// ==========================================
// Eventos Recorrentes do Calendário
// ==========================================

// Estado local do módulo
let recurringEventsData = [];
let editingRecurringEventId = null;

/**
 * Carrega a página de eventos recorrentes
 * @param {HTMLElement} container - Container onde o conteúdo será renderizado
 */
async function loadRecurringEvents(container) {
    container.innerHTML = `
        <div class="dashboard-loading">
            <div class="spinner"></div>
            <p>Carregando eventos recorrentes...</p>
        </div>
    `;
    
    try {
        const [events, ministries] = await Promise.all([
            apiRequest('GET', '/calendar-recurring-events'),
            apiRequest('GET', '/ministries').catch(() => [])
        ]);
        
        recurringEventsData = events || [];
        // Atualizar ministriesData global se existir
        if (typeof ministriesData !== 'undefined') {
            ministriesData = ministries || [];
        }
        
        container.innerHTML = renderRecurringEventsPage(recurringEventsData);
        setupRecurringEventEventListeners();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Erro ao carregar eventos recorrentes</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadSectionContent('recurring-events')">
                    <i class="fas fa-refresh"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

/**
 * Renderiza a página de eventos recorrentes
 * @param {array} events - Lista de eventos recorrentes
 * @returns {string} HTML da página
 */
function renderRecurringEventsPage(events) {
    const activeEvents = events.filter(e => e.active !== false);
    
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Eventos Recorrentes</h2>
                <p>Eventos que se repetem automaticamente</p>
            </div>
            <button class="btn btn-primary" onclick="openRecurringEventModal()">
                <i class="fas fa-plus"></i>
                Novo Evento Recorrente
            </button>
        </div>
        
        <!-- Resumo -->
        <div class="events-counters" style="grid-template-columns: repeat(2, 1fr);">
            <div class="counter-card primary">
                <i class="fas fa-repeat"></i>
                <div>
                    <span class="value">${activeEvents.length}</span>
                    <span class="label">Ativos</span>
                </div>
            </div>
            <div class="counter-card gray">
                <i class="fas fa-pause"></i>
                <div>
                    <span class="value">${events.length - activeEvents.length}</span>
                    <span class="label">Inativos</span>
                </div>
            </div>
        </div>
        
        <!-- Lista -->
        <div class="card">
            <div class="card-body">
                ${renderRecurringEventsList(events)}
            </div>
        </div>
        
        <!-- Modal -->
        ${renderRecurringEventModal()}
    `;
}

/**
 * Renderiza a lista de eventos recorrentes
 * @param {array} events - Lista de eventos
 * @returns {string} HTML da lista
 */
function renderRecurringEventsList(events) {
    if (events.length === 0) {
        return `
            <div class="empty-list">
                <i class="fas fa-calendar-check"></i>
                <p>Nenhum evento recorrente cadastrado</p>
            </div>
        `;
    }
    
    return `
        <div class="recurring-events-list">
            ${events.map(event => {
                const typeInfo = (typeof eventTypes !== 'undefined' ? eventTypes[event.type] : null) || 
                    { label: 'Outro', icon: 'fa-calendar', color: 'gray' };
                
                return `
                    <div class="recurring-event-item ${event.active === false ? 'inactive' : ''}">
                        <div class="recurring-event-icon ${typeInfo.color}">
                            <i class="fas ${typeInfo.icon}"></i>
                        </div>
                        <div class="recurring-event-info">
                            <h4>${event.title}</h4>
                            <div class="recurring-event-meta">
                                <span class="frequency">
                                    <i class="fas fa-repeat"></i>
                                    ${formatEventFrequency(event)}
                                </span>
                                <span class="time">
                                    <i class="fas fa-clock"></i>
                                    ${event.startTime} - ${event.endTime}
                                </span>
                                ${event.location ? `
                                    <span class="location">
                                        <i class="fas fa-map-marker-alt"></i>
                                        ${event.location}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                        <div class="recurring-event-status">
                            <span class="status-badge ${event.active !== false ? 'active' : 'inactive'}">
                                ${event.active !== false ? 'Ativo' : 'Inativo'}
                            </span>
                        </div>
                        <div class="recurring-event-actions">
                            <button class="btn-icon" onclick="editRecurringEvent('${event.id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon ${event.active !== false ? 'warning' : 'success'}" 
                                    onclick="toggleRecurringEvent('${event.id}', ${event.active !== false})" 
                                    title="${event.active !== false ? 'Desativar' : 'Ativar'}">
                                <i class="fas fa-${event.active !== false ? 'pause' : 'play'}"></i>
                            </button>
                            <button class="btn-icon danger" onclick="deleteRecurringEvent('${event.id}')" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Renderiza o modal de evento recorrente
 * @returns {string} HTML do modal
 */
function renderRecurringEventModal() {
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    return `
        <div id="recurring-event-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeRecurringEventModal()"></div>
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3 id="recurring-event-modal-title">Novo Evento Recorrente</h3>
                    <button class="modal-close" onclick="closeRecurringEventModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="recurring-event-form" class="modal-body">
                    <div class="form-group">
                        <label for="rec-event-title">Título *</label>
                        <input type="text" id="rec-event-title" placeholder="Nome do evento" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="rec-event-frequency">Frequência *</label>
                            <select id="rec-event-frequency" required onchange="updateRecurringEventFields()">
                                <option value="">Selecione</option>
                                <option value="WEEKLY">Semanal</option>
                                <option value="MONTHLY">Mensal</option>
                            </select>
                        </div>
                        <div class="form-group" id="weekday-group" style="display: none;">
                            <label for="rec-event-weekday">Dia da Semana *</label>
                            <select id="rec-event-weekday">
                                ${weekdays.map((d, i) => `<option value="${i}">${d}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" id="monthday-group" style="display: none;">
                            <label for="rec-event-monthday">Dia do Mês *</label>
                            <input type="number" id="rec-event-monthday" min="1" max="31" placeholder="1-31">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="rec-event-start-time">Hora Início *</label>
                            <input type="time" id="rec-event-start-time" required>
                        </div>
                        <div class="form-group">
                            <label for="rec-event-end-time">Hora Término *</label>
                            <input type="time" id="rec-event-end-time" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="rec-event-start-date">Data de Início *</label>
                        <input type="date" id="rec-event-start-date" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="rec-event-location">Local</label>
                        <input type="text" id="rec-event-location" placeholder="Ex: Templo Principal">
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="rec-event-active" checked>
                            <span>Evento ativo</span>
                        </label>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeRecurringEventModal()">Cancelar</button>
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
function setupRecurringEventEventListeners() {
    const form = document.getElementById('recurring-event-form');
    if (form) {
        form.addEventListener('submit', handleRecurringEventSubmit);
    }
}

/**
 * Atualiza os campos do formulário baseado na frequência
 */
function updateRecurringEventFields() {
    const frequency = document.getElementById('rec-event-frequency').value;
    const weekdayGroup = document.getElementById('weekday-group');
    const monthdayGroup = document.getElementById('monthday-group');
    
    weekdayGroup.style.display = frequency === 'WEEKLY' ? 'block' : 'none';
    monthdayGroup.style.display = frequency === 'MONTHLY' ? 'block' : 'none';
}

/**
 * Abre o modal de evento recorrente
 * @param {string|null} eventId - ID do evento para edição ou null para novo
 */
function openRecurringEventModal(eventId = null) {
    editingRecurringEventId = eventId;
    const modal = document.getElementById('recurring-event-modal');
    const title = document.getElementById('recurring-event-modal-title');
    const form = document.getElementById('recurring-event-form');
    
    form.reset();
    document.getElementById('rec-event-active').checked = true;
    document.getElementById('rec-event-start-date').value = new Date().toISOString().split('T')[0];
    updateRecurringEventFields();
    
    if (eventId) {
        title.textContent = 'Editar Evento Recorrente';
        const event = recurringEventsData.find(e => e.id === eventId);
        if (event) {
            document.getElementById('rec-event-title').value = event.title;
            document.getElementById('rec-event-frequency').value = event.frequency;
            updateRecurringEventFields();
            if (event.weekday !== undefined) {
                document.getElementById('rec-event-weekday').value = event.weekday;
            }
            if (event.monthDay) {
                document.getElementById('rec-event-monthday').value = event.monthDay;
            }
            document.getElementById('rec-event-start-time').value = event.startTime;
            document.getElementById('rec-event-end-time').value = event.endTime;
            document.getElementById('rec-event-start-date').value = event.startDate?.split('T')[0] || '';
            document.getElementById('rec-event-location').value = event.location || '';
            document.getElementById('rec-event-active').checked = event.active !== false;
        }
    } else {
        title.textContent = 'Novo Evento Recorrente';
    }
    
    modal.classList.remove('hidden');
}

/**
 * Fecha o modal de evento recorrente
 */
function closeRecurringEventModal() {
    const modal = document.getElementById('recurring-event-modal');
    modal.classList.add('hidden');
    editingRecurringEventId = null;
}

/**
 * Manipula o envio do formulário
 * @param {Event} e - Evento do formulário
 */
async function handleRecurringEventSubmit(e) {
    e.preventDefault();
    
    const frequency = document.getElementById('rec-event-frequency').value;
    
    const data = {
        churchId: AppState.church?.id,
        title: document.getElementById('rec-event-title').value,
        frequency,
        weekday: frequency === 'WEEKLY' ? parseInt(document.getElementById('rec-event-weekday').value) : undefined,
        monthDay: frequency === 'MONTHLY' ? parseInt(document.getElementById('rec-event-monthday').value) : undefined,
        startTime: document.getElementById('rec-event-start-time').value,
        endTime: document.getElementById('rec-event-end-time').value,
        startDate: document.getElementById('rec-event-start-date').value,
        location: document.getElementById('rec-event-location').value,
        active: document.getElementById('rec-event-active').checked,
        createdByUserId: AppState.user?.id
    };
    
    showLoading();
    
    try {
        if (editingRecurringEventId) {
            await apiRequest('PUT', `/calendar-recurring-events/${editingRecurringEventId}`, data);
            showToast('success', 'Evento atualizado!', 'O evento recorrente foi atualizado.');
        } else {
            await apiRequest('POST', '/calendar-recurring-events', data);
            showToast('success', 'Evento criado!', 'O novo evento recorrente foi criado.');
        }
        
        closeRecurringEventModal();
        await loadSectionContent('recurring-events');
        
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível salvar.');
    } finally {
        hideLoading();
    }
}

/**
 * Abre o modal para editar um evento recorrente
 * @param {string} eventId - ID do evento
 */
function editRecurringEvent(eventId) {
    openRecurringEventModal(eventId);
}

/**
 * Ativa/Desativa um evento recorrente
 * @param {string} eventId - ID do evento
 * @param {boolean} isActive - Estado atual
 */
async function toggleRecurringEvent(eventId, isActive) {
    showLoading();
    
    try {
        await apiRequest('PUT', `/calendar-recurring-events/${eventId}`, { active: !isActive });
        showToast('success', isActive ? 'Desativado!' : 'Ativado!', 
            `O evento foi ${isActive ? 'desativado' : 'ativado'}.`);
        await loadSectionContent('recurring-events');
    } catch (error) {
        showToast('error', 'Erro', error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Exclui um evento recorrente
 * @param {string} eventId - ID do evento
 */
async function deleteRecurringEvent(eventId) {
    if (!confirm('Deseja realmente excluir este evento recorrente?')) {
        return;
    }
    
    showLoading();
    
    try {
        await apiRequest('DELETE', `/calendar-recurring-events/${eventId}`);
        showToast('success', 'Excluído!', 'O evento recorrente foi removido.');
        await loadSectionContent('recurring-events');
    } catch (error) {
        showToast('error', 'Erro', error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Formata a frequência do evento para exibição
 * @param {object} event - Evento
 * @returns {string} Texto formatado
 */
function formatEventFrequency(event) {
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    if (event.frequency === 'WEEKLY' && event.weekday !== undefined) {
        return `Todo(a) ${weekdays[event.weekday]}`;
    }
    if (event.frequency === 'MONTHLY' && event.monthDay) {
        return `Todo dia ${event.monthDay}`;
    }
    
    // Fallback
    const frequencies = {
        WEEKLY: 'Semanal',
        MONTHLY: 'Mensal',
        DAILY: 'Diário'
    };
    return frequencies[event.frequency] || event.frequency;
}

// Exportar para uso global
window.loadRecurringEvents = loadRecurringEvents;
window.renderRecurringEventsPage = renderRecurringEventsPage;
window.renderRecurringEventsList = renderRecurringEventsList;
window.renderRecurringEventModal = renderRecurringEventModal;
window.setupRecurringEventEventListeners = setupRecurringEventEventListeners;
window.updateRecurringEventFields = updateRecurringEventFields;
window.openRecurringEventModal = openRecurringEventModal;
window.closeRecurringEventModal = closeRecurringEventModal;
window.handleRecurringEventSubmit = handleRecurringEventSubmit;
window.editRecurringEvent = editRecurringEvent;
window.toggleRecurringEvent = toggleRecurringEvent;
window.deleteRecurringEvent = deleteRecurringEvent;
window.formatEventFrequency = formatEventFrequency;

