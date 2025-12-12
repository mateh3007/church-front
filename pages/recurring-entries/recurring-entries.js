// ==========================================
// Lançamentos Recorrentes (Financeiro)
// ==========================================

// Estado local do módulo
let recurringEntriesData = [];
let recurringCategoriesData = [];
let recurringMinistriesData = [];
let editingRecurringId = null;

/**
 * Carrega a página de lançamentos recorrentes
 * @param {HTMLElement} container - Container onde o conteúdo será renderizado
 */
async function loadRecurringEntries(container) {
    container.innerHTML = `
        <div class="dashboard-loading">
            <div class="spinner"></div>
            <p>Carregando lançamentos recorrentes...</p>
        </div>
    `;
    
    try {
        const [recurring, categories, ministries] = await Promise.all([
            apiRequest('GET', '/financial-recurring-entries'),
            apiRequest('GET', '/financial-categories').catch(() => []),
            apiRequest('GET', '/ministries').catch(() => [])
        ]);
        
        recurringEntriesData = recurring || [];
        recurringCategoriesData = categories || [];
        recurringMinistriesData = ministries || [];
        
        container.innerHTML = renderRecurringPage(recurringEntriesData);
        setupRecurringEventListeners();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Erro ao carregar lançamentos recorrentes</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadSectionContent('recurring')">
                    <i class="fas fa-refresh"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

/**
 * Renderiza a página de lançamentos recorrentes
 * @param {array} entries - Lista de lançamentos recorrentes
 * @returns {string} HTML da página
 */
function renderRecurringPage(entries) {
    const activeEntries = entries.filter(e => e.active !== false);
    const totalMonthlyIncome = activeEntries
        .filter(e => e.type === 'INCOME' && e.frequency === 'MONTHLY')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalMonthlyExpense = activeEntries
        .filter(e => e.type === 'EXPENSE' && e.frequency === 'MONTHLY')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Lançamentos Recorrentes</h2>
                <p>Gerencie despesas e receitas que se repetem automaticamente</p>
            </div>
            <button class="btn btn-primary" onclick="openRecurringModal()">
                <i class="fas fa-plus"></i>
                Novo Recorrente
            </button>
        </div>
        
        <!-- Cards de Resumo Mensal -->
        <div class="entries-summary">
            <div class="summary-card income">
                <i class="fas fa-arrow-up"></i>
                <div>
                    <span class="label">Receitas Mensais</span>
                    <span class="value">${formatCurrency(totalMonthlyIncome)}</span>
                </div>
            </div>
            <div class="summary-card expense">
                <i class="fas fa-arrow-down"></i>
                <div>
                    <span class="label">Despesas Mensais</span>
                    <span class="value">${formatCurrency(totalMonthlyExpense)}</span>
                </div>
            </div>
            <div class="summary-card ${totalMonthlyIncome - totalMonthlyExpense >= 0 ? 'positive' : 'negative'}">
                <i class="fas fa-calculator"></i>
                <div>
                    <span class="label">Projeção Mensal</span>
                    <span class="value">${formatCurrency(totalMonthlyIncome - totalMonthlyExpense)}</span>
                </div>
            </div>
        </div>
        
        <!-- Lista de Recorrentes -->
        <div class="recurring-grid">
            <!-- Receitas Recorrentes -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-arrow-up" style="color: var(--success)"></i> Receitas Recorrentes</h3>
                    <span class="badge badge-success">${entries.filter(e => e.type === 'INCOME').length}</span>
                </div>
                <div class="card-body">
                    ${renderRecurringList(entries.filter(e => e.type === 'INCOME'), 'INCOME')}
                </div>
            </div>
            
            <!-- Despesas Recorrentes -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-arrow-down" style="color: var(--danger)"></i> Despesas Recorrentes</h3>
                    <span class="badge badge-danger">${entries.filter(e => e.type === 'EXPENSE').length}</span>
                </div>
                <div class="card-body">
                    ${renderRecurringList(entries.filter(e => e.type === 'EXPENSE'), 'EXPENSE')}
                </div>
            </div>
        </div>
        
        <!-- Modal -->
        ${renderRecurringModal()}
    `;
}

/**
 * Renderiza a lista de lançamentos recorrentes
 * @param {array} entries - Lista de lançamentos
 * @param {string} type - Tipo (INCOME/EXPENSE)
 * @returns {string} HTML da lista
 */
function renderRecurringList(entries, type) {
    if (entries.length === 0) {
        return `
            <div class="empty-list">
                <i class="fas fa-repeat"></i>
                <p>Nenhum lançamento recorrente</p>
            </div>
        `;
    }
    
    return `
        <ul class="recurring-list">
            ${entries.map(entry => `
                <li class="recurring-item ${entry.active === false ? 'inactive' : ''}">
                    <div class="recurring-main">
                        <div class="recurring-icon ${type.toLowerCase()}">
                            <i class="fas fa-${type === 'INCOME' ? 'arrow-up' : 'arrow-down'}"></i>
                        </div>
                        <div class="recurring-info">
                            <span class="recurring-name">${entry.description || entry.category?.name || 'Sem descrição'}</span>
                            <div class="recurring-meta">
                                <span class="recurring-category">${entry.category?.name || 'Sem categoria'}</span>
                                <span class="recurring-frequency">
                                    <i class="fas fa-calendar"></i>
                                    ${formatFrequency(entry.frequency)} - Dia ${entry.dueDay}
                                </span>
                            </div>
                        </div>
                        <div class="recurring-amount ${type.toLowerCase()}">
                            ${formatCurrency(entry.amount)}
                        </div>
                        <div class="recurring-status">
                            <span class="status-badge ${entry.active !== false ? 'active' : 'inactive'}">
                                ${entry.active !== false ? 'Ativo' : 'Inativo'}
                            </span>
                        </div>
                        <div class="recurring-actions">
                            <button class="btn-icon" onclick="editRecurring('${entry.id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon ${entry.active !== false ? 'warning' : 'success'}" 
                                    onclick="toggleRecurring('${entry.id}', ${entry.active !== false})" 
                                    title="${entry.active !== false ? 'Desativar' : 'Ativar'}">
                                <i class="fas fa-${entry.active !== false ? 'pause' : 'play'}"></i>
                            </button>
                            <button class="btn-icon danger" onclick="deleteRecurring('${entry.id}')" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </li>
            `).join('')}
        </ul>
    `;
}

/**
 * Renderiza o modal de lançamento recorrente
 * @returns {string} HTML do modal
 */
function renderRecurringModal() {
    return `
        <div id="recurring-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeRecurringModal()"></div>
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3 id="recurring-modal-title">Novo Lançamento Recorrente</h3>
                    <button class="modal-close" onclick="closeRecurringModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="recurring-form" class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="recurring-type">Tipo *</label>
                            <select id="recurring-type" required onchange="updateRecurringCategoryOptions()">
                                <option value="">Selecione o tipo</option>
                                <option value="INCOME">Receita</option>
                                <option value="EXPENSE">Despesa</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="recurring-category">Categoria *</label>
                            <select id="recurring-category" required>
                                <option value="">Selecione o tipo primeiro</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="recurring-amount">Valor *</label>
                            <input type="number" id="recurring-amount" step="0.01" min="0.01" placeholder="0,00" required>
                        </div>
                        <div class="form-group">
                            <label for="recurring-frequency">Frequência *</label>
                            <select id="recurring-frequency" required>
                                <option value="">Selecione</option>
                                <option value="DAILY">Diário</option>
                                <option value="WEEKLY">Semanal</option>
                                <option value="MONTHLY">Mensal</option>
                                <option value="YEARLY">Anual</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="recurring-due-day">Dia do Vencimento *</label>
                            <input type="number" id="recurring-due-day" min="1" max="31" placeholder="1-31" required>
                        </div>
                        <div class="form-group">
                            <label for="recurring-ministry">Ministério (opcional)</label>
                            <select id="recurring-ministry">
                                <option value="">Nenhum</option>
                                ${recurringMinistriesData.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="recurring-description">Descrição</label>
                        <input type="text" id="recurring-description" placeholder="Ex: Aluguel, Conta de luz...">
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="recurring-active" checked>
                            <span>Lançamento ativo</span>
                        </label>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeRecurringModal()">Cancelar</button>
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
function setupRecurringEventListeners() {
    const form = document.getElementById('recurring-form');
    if (form) {
        form.addEventListener('submit', handleRecurringSubmit);
    }
}

/**
 * Atualiza as opções de categoria baseado no tipo selecionado
 */
function updateRecurringCategoryOptions() {
    const type = document.getElementById('recurring-type').value;
    const categorySelect = document.getElementById('recurring-category');
    
    if (!type) {
        categorySelect.innerHTML = '<option value="">Selecione o tipo primeiro</option>';
        return;
    }
    
    const filteredCategories = recurringCategoriesData.filter(c => c.type === type);
    
    categorySelect.innerHTML = `
        <option value="">Selecione a categoria</option>
        ${filteredCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
    `;
}

/**
 * Abre o modal de lançamento recorrente
 * @param {string|null} entryId - ID do lançamento para edição ou null para novo
 */
function openRecurringModal(entryId = null) {
    editingRecurringId = entryId;
    const modal = document.getElementById('recurring-modal');
    const title = document.getElementById('recurring-modal-title');
    const form = document.getElementById('recurring-form');
    
    form.reset();
    document.getElementById('recurring-active').checked = true;
    
    if (entryId) {
        title.textContent = 'Editar Lançamento Recorrente';
        const entry = recurringEntriesData.find(e => e.id === entryId);
        if (entry) {
            document.getElementById('recurring-type').value = entry.type;
            updateRecurringCategoryOptions();
            document.getElementById('recurring-category').value = entry.categoryId;
            document.getElementById('recurring-amount').value = parseFloat(entry.amount);
            document.getElementById('recurring-frequency').value = entry.frequency;
            document.getElementById('recurring-due-day').value = entry.dueDay;
            document.getElementById('recurring-description').value = entry.description || '';
            document.getElementById('recurring-ministry').value = entry.ministryId || '';
            document.getElementById('recurring-active').checked = entry.active !== false;
        }
    } else {
        title.textContent = 'Novo Lançamento Recorrente';
        document.getElementById('recurring-category').innerHTML = '<option value="">Selecione o tipo primeiro</option>';
    }
    
    modal.classList.remove('hidden');
}

/**
 * Fecha o modal de lançamento recorrente
 */
function closeRecurringModal() {
    const modal = document.getElementById('recurring-modal');
    modal.classList.add('hidden');
    editingRecurringId = null;
}

/**
 * Manipula o envio do formulário
 * @param {Event} e - Evento do formulário
 */
async function handleRecurringSubmit(e) {
    e.preventDefault();
    
    const type = document.getElementById('recurring-type').value;
    const categoryId = document.getElementById('recurring-category').value;
    const amount = parseFloat(document.getElementById('recurring-amount').value);
    const frequency = document.getElementById('recurring-frequency').value;
    const dueDay = parseInt(document.getElementById('recurring-due-day').value);
    const description = document.getElementById('recurring-description').value;
    const ministryId = document.getElementById('recurring-ministry').value || null;
    const active = document.getElementById('recurring-active').checked;
    
    const data = {
        churchId: AppState.church?.id,
        categoryId,
        userId: AppState.user?.id,
        type,
        amount,
        frequency,
        dueDay,
        description,
        ministryId,
        active
    };
    
    showLoading();
    
    try {
        if (editingRecurringId) {
            await apiRequest('PUT', `/financial-recurring-entries/${editingRecurringId}`, {
                categoryId,
                amount,
                frequency,
                dueDay,
                description,
                ministryId,
                active
            });
            showToast('success', 'Recorrente atualizado!', 'O lançamento recorrente foi atualizado.');
        } else {
            await apiRequest('POST', '/financial-recurring-entries', data);
            showToast('success', 'Recorrente criado!', 'O novo lançamento recorrente foi criado.');
        }
        
        closeRecurringModal();
        await loadSectionContent('recurring');
        
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível salvar.');
    } finally {
        hideLoading();
    }
}

/**
 * Abre o modal para editar um lançamento recorrente
 * @param {string} entryId - ID do lançamento
 */
function editRecurring(entryId) {
    openRecurringModal(entryId);
}

/**
 * Alterna o status ativo/inativo de um lançamento recorrente
 * @param {string} entryId - ID do lançamento
 * @param {boolean} isActive - Status atual
 */
async function toggleRecurring(entryId, isActive) {
    showLoading();
    
    try {
        await apiRequest('PUT', `/financial-recurring-entries/${entryId}`, {
            active: !isActive
        });
        showToast('success', isActive ? 'Desativado!' : 'Ativado!', 
            `O lançamento foi ${isActive ? 'desativado' : 'ativado'}.`);
        await loadSectionContent('recurring');
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível alterar o status.');
    } finally {
        hideLoading();
    }
}

/**
 * Exclui um lançamento recorrente
 * @param {string} entryId - ID do lançamento
 */
async function deleteRecurring(entryId) {
    if (!confirm('Deseja realmente excluir este lançamento recorrente?')) {
        return;
    }
    
    showLoading();
    
    try {
        await apiRequest('DELETE', `/financial-recurring-entries/${entryId}`);
        showToast('success', 'Excluído!', 'O lançamento recorrente foi removido.');
        await loadSectionContent('recurring');
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível excluir.');
    } finally {
        hideLoading();
    }
}

/**
 * Formata a frequência para exibição
 * @param {string} frequency - Frequência em inglês
 * @returns {string} Frequência em português
 */
function formatFrequency(frequency) {
    const frequencies = {
        DAILY: 'Diário',
        WEEKLY: 'Semanal',
        MONTHLY: 'Mensal',
        YEARLY: 'Anual'
    };
    return frequencies[frequency] || frequency;
}

// Exportar para uso global
window.loadRecurringEntries = loadRecurringEntries;
window.renderRecurringPage = renderRecurringPage;
window.renderRecurringList = renderRecurringList;
window.renderRecurringModal = renderRecurringModal;
window.setupRecurringEventListeners = setupRecurringEventListeners;
window.updateRecurringCategoryOptions = updateRecurringCategoryOptions;
window.openRecurringModal = openRecurringModal;
window.closeRecurringModal = closeRecurringModal;
window.handleRecurringSubmit = handleRecurringSubmit;
window.editRecurring = editRecurring;
window.toggleRecurring = toggleRecurring;
window.deleteRecurring = deleteRecurring;
window.formatFrequency = formatFrequency;

