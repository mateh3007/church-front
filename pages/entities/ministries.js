// ==========================================
// Ministérios
// ==========================================

// Estado local do módulo
let ministriesFullData = [];
let ministriesUsersData = [];
let editingMinistryId = null;

/**
 * Carrega a página de ministérios
 * @param {HTMLElement} container - Container onde o conteúdo será renderizado
 */
async function loadMinistries(container) {
    container.innerHTML = `<div class="dashboard-loading"><div class="spinner"></div><p>Carregando ministérios...</p></div>`;
    
    try {
        const [ministries, users] = await Promise.all([
            apiRequest('GET', '/ministries'),
            apiRequest('GET', '/users').catch(() => [])
        ]);
        ministriesFullData = ministries || [];
        ministriesUsersData = users || [];
        container.innerHTML = renderMinistriesPage(ministriesFullData);
        setupMinistryListeners();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Erro ao carregar ministérios</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadSectionContent('ministries')">
                    <i class="fas fa-refresh"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

/**
 * Renderiza a página de ministérios
 * @param {array} ministries - Lista de ministérios
 * @returns {string} HTML da página
 */
function renderMinistriesPage(ministries) {
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Ministérios</h2>
                <p>Áreas de atuação da igreja</p>
            </div>
            <button class="btn btn-primary" onclick="openMinistryModal()">
                <i class="fas fa-plus"></i> Novo Ministério
            </button>
        </div>
        
        <div class="entities-grid">
            ${ministries.length === 0 ? `
                <div class="empty-state">
                    <i class="fas fa-hands-praying"></i>
                    <h3>Nenhum ministério cadastrado</h3>
                    <p>Clique no botão acima para criar o primeiro ministério</p>
                </div>
            ` : ministries.map(m => `
                <div class="entity-card">
                    <div class="entity-icon ministry">
                        <i class="fas fa-hands-praying"></i>
                    </div>
                    <div class="entity-info">
                        <h4>${m.name}</h4>
                        <p>${m.description || 'Sem descrição'}</p>
                        ${m.leader ? `
                            <span class="entity-meta">
                                <i class="fas fa-user"></i> Líder: ${m.leader.name}
                            </span>
                        ` : ''}
                    </div>
                    <div class="entity-actions">
                        <button class="btn-icon" onclick="editMinistry('${m.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon danger" onclick="deleteMinistry('${m.id}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
        
        ${renderMinistryModal()}
    `;
}

/**
 * Renderiza o modal de ministério
 * @returns {string} HTML do modal
 */
function renderMinistryModal() {
    const leaders = ministriesUsersData.filter(u => ['LEADER', 'PASTOR', 'ADMIN'].includes(u.role));
    
    return `
        <div id="ministry-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeMinistryModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="ministry-modal-title">Novo Ministério</h3>
                    <button class="modal-close" onclick="closeMinistryModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="ministry-form" class="modal-body">
                    <div class="form-group">
                        <label for="ministry-name-edit">Nome *</label>
                        <input type="text" id="ministry-name-edit" required>
                    </div>
                    <div class="form-group">
                        <label for="ministry-desc-edit">Descrição</label>
                        <textarea id="ministry-desc-edit" rows="2"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="ministry-leader-edit">Líder</label>
                        <select id="ministry-leader-edit">
                            <option value="">Nenhum</option>
                            ${leaders.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeMinistryModal()">Cancelar</button>
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
function setupMinistryListeners() {
    document.getElementById('ministry-form')?.addEventListener('submit', handleMinistrySubmit);
}

/**
 * Abre o modal de ministério
 * @param {string|null} id - ID do ministério para edição ou null para novo
 */
function openMinistryModal(id = null) {
    editingMinistryId = id;
    const form = document.getElementById('ministry-form');
    form.reset();
    document.getElementById('ministry-modal-title').textContent = id ? 'Editar Ministério' : 'Novo Ministério';
    
    if (id) {
        const ministry = ministriesFullData.find(m => m.id === id);
        if (ministry) {
            document.getElementById('ministry-name-edit').value = ministry.name;
            document.getElementById('ministry-desc-edit').value = ministry.description || '';
            document.getElementById('ministry-leader-edit').value = ministry.leaderUserId || '';
        }
    }
    document.getElementById('ministry-modal').classList.remove('hidden');
}

/**
 * Abre o modal para editar um ministério
 * @param {string} id - ID do ministério
 */
function editMinistry(id) {
    openMinistryModal(id);
}

/**
 * Fecha o modal de ministério
 */
function closeMinistryModal() {
    document.getElementById('ministry-modal').classList.add('hidden');
    editingMinistryId = null;
}

/**
 * Manipula o envio do formulário de ministério
 * @param {Event} e - Evento do formulário
 */
async function handleMinistrySubmit(e) {
    e.preventDefault();
    showLoading();
    
    const data = {
        churchId: AppState.church?.id,
        name: document.getElementById('ministry-name-edit').value,
        description: document.getElementById('ministry-desc-edit').value,
        leaderUserId: document.getElementById('ministry-leader-edit').value || null
    };
    
    try {
        if (editingMinistryId) {
            await apiRequest('PUT', `/ministries/${editingMinistryId}`, data);
            showToast('success', 'Ministério atualizado!', '');
        } else {
            await apiRequest('POST', '/ministries', data);
            showToast('success', 'Ministério criado!', '');
        }
        closeMinistryModal();
        await loadSectionContent('ministries');
    } catch (error) {
        showToast('error', 'Erro', error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Exclui um ministério
 * @param {string} id - ID do ministério
 */
async function deleteMinistry(id) {
    if (!confirm('Deseja realmente excluir este ministério?')) return;
    
    showLoading();
    try {
        await apiRequest('DELETE', `/ministries/${id}`);
        showToast('success', 'Ministério excluído!', '');
        await loadSectionContent('ministries');
    } catch (error) {
        showToast('error', 'Erro', error.message);
    } finally {
        hideLoading();
    }
}

// Exportar para uso global
window.loadMinistries = loadMinistries;
window.renderMinistriesPage = renderMinistriesPage;
window.setupMinistryListeners = setupMinistryListeners;
window.openMinistryModal = openMinistryModal;
window.editMinistry = editMinistry;
window.closeMinistryModal = closeMinistryModal;
window.handleMinistrySubmit = handleMinistrySubmit;
window.deleteMinistry = deleteMinistry;

