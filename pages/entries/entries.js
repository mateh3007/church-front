// ==========================================
// Lançamentos Financeiros
// ==========================================

// Estado local do módulo
let entriesData = [];
let entriesCategoriesData = [];
let entriesMinistriesData = [];
let editingEntryId = null;

/**
 * Carrega a página de lançamentos financeiros
 * @param {HTMLElement} container - Container onde o conteúdo será renderizado
 */
async function loadEntries(container) {
    container.innerHTML = `
        <div class="dashboard-loading">
            <div class="spinner"></div>
            <p>Carregando lançamentos...</p>
        </div>
    `;
    
    try {
        const churchId = AppState.church?.id;
        
        // Buscar dados em paralelo
        const [entries, categories, ministries] = await Promise.all([
            apiRequest('GET', `/financial-entries${churchId ? `?churchId=${churchId}` : ''}`),
            apiRequest('GET', '/financial-categories').catch(() => []),
            apiRequest('GET', '/ministries').catch(() => [])
        ]);
        
        entriesData = entries || [];
        entriesCategoriesData = categories || [];
        entriesMinistriesData = ministries || [];
        
        container.innerHTML = renderEntriesPage(entriesData);
        setupEntryEventListeners();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Erro ao carregar lançamentos</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadSectionContent('entries')">
                    <i class="fas fa-refresh"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

/**
 * Renderiza a página de lançamentos
 * @param {array} entries - Lista de lançamentos
 * @returns {string} HTML da página
 */
function renderEntriesPage(entries) {
    // Calcular totais
    const totalIncome = entries.filter(e => e.type === 'INCOME').reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalExpense = entries.filter(e => e.type === 'EXPENSE').reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const balance = totalIncome - totalExpense;
    
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Lançamentos Financeiros</h2>
                <p>Gerencie as entradas e saídas</p>
            </div>
            <button class="btn btn-primary" onclick="openEntryModal()">
                <i class="fas fa-plus"></i>
                Novo Lançamento
            </button>
        </div>
        
        <!-- Cards de Resumo -->
        <div class="entries-summary">
            <div class="summary-card income">
                <i class="fas fa-arrow-up"></i>
                <div>
                    <span class="label">Total Receitas</span>
                    <span class="value">${formatCurrency(totalIncome)}</span>
                </div>
            </div>
            <div class="summary-card expense">
                <i class="fas fa-arrow-down"></i>
                <div>
                    <span class="label">Total Despesas</span>
                    <span class="value">${formatCurrency(totalExpense)}</span>
                </div>
            </div>
            <div class="summary-card ${balance >= 0 ? 'positive' : 'negative'}">
                <i class="fas fa-wallet"></i>
                <div>
                    <span class="label">Saldo</span>
                    <span class="value">${formatCurrency(balance)}</span>
                </div>
            </div>
        </div>
        
        <!-- Filtros -->
        <div class="filters-bar">
            <div class="filter-group">
                <select id="filter-type" onchange="filterEntries()">
                    <option value="">Todos os tipos</option>
                    <option value="INCOME">Receitas</option>
                    <option value="EXPENSE">Despesas</option>
                </select>
                <select id="filter-category" onchange="filterEntries()">
                    <option value="">Todas as categorias</option>
                    ${entriesCategoriesData.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="entries-count">
                <span id="entries-count-text">${entries.length} lançamentos</span>
            </div>
        </div>
        
        <!-- Tabela de Lançamentos -->
        <div class="card">
            <div class="table-container">
                ${renderEntriesTable(entries)}
            </div>
        </div>
        
        <!-- Modal de Lançamento -->
        ${renderEntryModal()}
    `;
}

/**
 * Renderiza a tabela de lançamentos
 * @param {array} entries - Lista de lançamentos
 * @returns {string} HTML da tabela
 */
function renderEntriesTable(entries) {
    if (entries.length === 0) {
        return `
            <div class="empty-list" style="padding: 60px 20px;">
                <i class="fas fa-receipt"></i>
                <p>Nenhum lançamento encontrado</p>
            </div>
        `;
    }
    
    // Ordenar por data (mais recentes primeiro)
    const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return `
        <table class="data-table" id="entries-table">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>Tipo</th>
                    <th class="text-right">Valor</th>
                    <th class="text-center">Ações</th>
                </tr>
            </thead>
            <tbody>
                ${sortedEntries.map(entry => `
                    <tr data-id="${entry.id}" data-type="${entry.type}" data-category="${entry.categoryId}">
                        <td>
                            <span class="date-cell">${formatDate(entry.date)}</span>
                        </td>
                        <td>
                            <div class="description-cell">
                                <span class="description-text">${entry.description || 'Sem descrição'}</span>
                                ${entry.ministry ? `<span class="ministry-badge">${entry.ministry.name}</span>` : ''}
                            </div>
                        </td>
                        <td>
                            <span class="category-badge ${entry.type.toLowerCase()}">
                                ${entry.category?.name || 'Sem categoria'}
                            </span>
                        </td>
                        <td>
                            <span class="type-indicator ${entry.type.toLowerCase()}">
                                <i class="fas fa-${entry.type === 'INCOME' ? 'arrow-up' : 'arrow-down'}"></i>
                                ${entry.type === 'INCOME' ? 'Receita' : 'Despesa'}
                            </span>
                        </td>
                        <td class="text-right">
                            <span class="amount ${entry.type.toLowerCase()}">${formatCurrency(entry.amount)}</span>
                        </td>
                        <td class="text-center">
                            <div class="table-actions">
                                <button class="btn-icon" onclick="editEntry('${entry.id}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon danger" onclick="deleteEntry('${entry.id}')" title="Excluir">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

/**
 * Renderiza o modal de lançamento
 * @returns {string} HTML do modal
 */
function renderEntryModal() {
    return `
        <div id="entry-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeEntryModal()"></div>
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3 id="entry-modal-title">Novo Lançamento</h3>
                    <button class="modal-close" onclick="closeEntryModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="entry-form" class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="entry-type">Tipo *</label>
                            <select id="entry-type" required onchange="updateEntryCategoryOptions()">
                                <option value="">Selecione o tipo</option>
                                <option value="INCOME">Receita</option>
                                <option value="EXPENSE">Despesa</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="entry-category">Categoria *</label>
                            <select id="entry-category" required>
                                <option value="">Selecione o tipo primeiro</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="entry-amount">Valor *</label>
                            <input type="number" id="entry-amount" step="0.01" min="0.01" placeholder="0,00" required>
                        </div>
                        <div class="form-group">
                            <label for="entry-date">Data *</label>
                            <input type="date" id="entry-date" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="entry-description">Descrição</label>
                        <textarea id="entry-description" rows="2" placeholder="Descrição do lançamento..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="entry-ministry">Ministério (opcional)</label>
                        <select id="entry-ministry">
                            <option value="">Nenhum</option>
                            ${entriesMinistriesData.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeEntryModal()">Cancelar</button>
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
function setupEntryEventListeners() {
    const form = document.getElementById('entry-form');
    if (form) {
        form.addEventListener('submit', handleEntrySubmit);
    }
}

/**
 * Atualiza as opções de categoria baseado no tipo selecionado
 */
function updateEntryCategoryOptions() {
    const type = document.getElementById('entry-type').value;
    const categorySelect = document.getElementById('entry-category');
    
    if (!type) {
        categorySelect.innerHTML = '<option value="">Selecione o tipo primeiro</option>';
        return;
    }
    
    const filteredCategories = entriesCategoriesData.filter(c => c.type === type);
    
    categorySelect.innerHTML = `
        <option value="">Selecione a categoria</option>
        ${filteredCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
    `;
}

/**
 * Abre o modal de lançamento
 * @param {string|null} entryId - ID do lançamento para edição ou null para novo
 */
function openEntryModal(entryId = null) {
    editingEntryId = entryId;
    const modal = document.getElementById('entry-modal');
    const title = document.getElementById('entry-modal-title');
    const form = document.getElementById('entry-form');
    
    form.reset();
    
    // Data padrão: hoje
    document.getElementById('entry-date').value = new Date().toISOString().split('T')[0];
    
    if (entryId) {
        title.textContent = 'Editar Lançamento';
        const entry = entriesData.find(e => e.id === entryId);
        if (entry) {
            document.getElementById('entry-type').value = entry.type;
            updateEntryCategoryOptions();
            document.getElementById('entry-category').value = entry.categoryId;
            document.getElementById('entry-amount').value = parseFloat(entry.amount);
            document.getElementById('entry-date').value = entry.date.split('T')[0];
            document.getElementById('entry-description').value = entry.description || '';
            document.getElementById('entry-ministry').value = entry.ministryId || '';
        }
    } else {
        title.textContent = 'Novo Lançamento';
        document.getElementById('entry-category').innerHTML = '<option value="">Selecione o tipo primeiro</option>';
    }
    
    modal.classList.remove('hidden');
}

/**
 * Fecha o modal de lançamento
 */
function closeEntryModal() {
    const modal = document.getElementById('entry-modal');
    modal.classList.add('hidden');
    editingEntryId = null;
}

/**
 * Manipula o envio do formulário de lançamento
 * @param {Event} e - Evento do formulário
 */
async function handleEntrySubmit(e) {
    e.preventDefault();
    
    const type = document.getElementById('entry-type').value;
    const categoryId = document.getElementById('entry-category').value;
    const amount = parseFloat(document.getElementById('entry-amount').value);
    const date = document.getElementById('entry-date').value;
    const description = document.getElementById('entry-description').value;
    const ministryId = document.getElementById('entry-ministry').value || null;
    
    const data = {
        churchId: AppState.church?.id,
        categoryId,
        userId: AppState.user?.id,
        type,
        amount,
        date,
        description,
        ministryId
    };
    
    showLoading();
    
    try {
        if (editingEntryId) {
            await apiRequest('PUT', `/financial-entries/${editingEntryId}`, {
                categoryId,
                amount,
                date,
                description,
                ministryId
            });
            showToast('success', 'Lançamento atualizado!', 'O lançamento foi atualizado com sucesso.');
        } else {
            await apiRequest('POST', '/financial-entries', data);
            showToast('success', 'Lançamento criado!', 'O novo lançamento foi registrado com sucesso.');
        }
        
        closeEntryModal();
        await loadSectionContent('entries');
        
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível salvar o lançamento.');
    } finally {
        hideLoading();
    }
}

/**
 * Abre o modal para editar um lançamento
 * @param {string} entryId - ID do lançamento
 */
function editEntry(entryId) {
    openEntryModal(entryId);
}

/**
 * Exclui um lançamento
 * @param {string} entryId - ID do lançamento
 */
async function deleteEntry(entryId) {
    const entry = entriesData.find(e => e.id === entryId);
    if (!confirm(`Deseja realmente excluir este lançamento de ${formatCurrency(entry?.amount)}?`)) {
        return;
    }
    
    showLoading();
    
    try {
        await apiRequest('DELETE', `/financial-entries/${entryId}`);
        showToast('success', 'Lançamento excluído!', 'O lançamento foi removido com sucesso.');
        await loadSectionContent('entries');
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível excluir o lançamento.');
    } finally {
        hideLoading();
    }
}

/**
 * Filtra os lançamentos na tabela
 */
function filterEntries() {
    const typeFilter = document.getElementById('filter-type').value;
    const categoryFilter = document.getElementById('filter-category').value;
    
    const rows = document.querySelectorAll('#entries-table tbody tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const type = row.dataset.type;
        const category = row.dataset.category;
        
        const typeMatch = !typeFilter || type === typeFilter;
        const categoryMatch = !categoryFilter || category === categoryFilter;
        
        if (typeMatch && categoryMatch) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    document.getElementById('entries-count-text').textContent = `${visibleCount} lançamentos`;
}

// Exportar para uso global
window.loadEntries = loadEntries;
window.renderEntriesPage = renderEntriesPage;
window.renderEntriesTable = renderEntriesTable;
window.renderEntryModal = renderEntryModal;
window.setupEntryEventListeners = setupEntryEventListeners;
window.updateEntryCategoryOptions = updateEntryCategoryOptions;
window.openEntryModal = openEntryModal;
window.closeEntryModal = closeEntryModal;
window.handleEntrySubmit = handleEntrySubmit;
window.editEntry = editEntry;
window.deleteEntry = deleteEntry;
window.filterEntries = filterEntries;

