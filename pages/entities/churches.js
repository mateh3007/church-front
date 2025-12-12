// ==========================================
// Igrejas
// ==========================================

// Estado local do módulo
let churchesData = [];
let editingChurchId = null;

/**
 * Carrega a página de igrejas
 * @param {HTMLElement} container - Container onde o conteúdo será renderizado
 */
async function loadChurches(container) {
    container.innerHTML = `<div class="dashboard-loading"><div class="spinner"></div><p>Carregando igrejas...</p></div>`;
    
    try {
        churchesData = await apiRequest('GET', '/churches');
        container.innerHTML = renderChurchesPage(churchesData);
        setupChurchListeners();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Erro ao carregar igrejas</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadSectionContent('churches')">
                    <i class="fas fa-refresh"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

/**
 * Renderiza a página de igrejas
 * @param {array} churches - Lista de igrejas
 * @returns {string} HTML da página
 */
function renderChurchesPage(churches) {
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Igrejas</h2>
                <p>Unidades da organização</p>
            </div>
            <button class="btn btn-primary" onclick="openChurchModal()">
                <i class="fas fa-plus"></i> Nova Igreja
            </button>
        </div>
        
        <div class="entities-grid">
            ${churches.length === 0 ? `
                <div class="empty-state">
                    <i class="fas fa-church"></i>
                    <h3>Nenhuma igreja cadastrada</h3>
                    <p>Clique no botão acima para criar a primeira igreja</p>
                </div>
            ` : churches.map(c => `
                <div class="entity-card">
                    <div class="entity-icon church">
                        <i class="fas fa-church"></i>
                    </div>
                    <div class="entity-info">
                        <h4>${c.name}</h4>
                        <p>${c.description || 'Sem descrição'}</p>
                        <span class="entity-meta">
                            <i class="fas fa-map-marker-alt"></i> ${c.address || 'Endereço não informado'}
                        </span>
                    </div>
                    <div class="entity-actions">
                        <button class="btn-icon" onclick="editChurch('${c.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon danger" onclick="deleteChurch('${c.id}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
        
        ${renderChurchModal()}
    `;
}

/**
 * Renderiza o modal de igreja
 * @returns {string} HTML do modal
 */
function renderChurchModal() {
    return `
        <div id="church-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeChurchModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="church-modal-title">Nova Igreja</h3>
                    <button class="modal-close" onclick="closeChurchModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="church-form" class="modal-body">
                    <div class="form-group">
                        <label for="church-name-edit">Nome *</label>
                        <input type="text" id="church-name-edit" required>
                    </div>
                    <div class="form-group">
                        <label for="church-desc-edit">Descrição</label>
                        <input type="text" id="church-desc-edit">
                    </div>
                    <div class="form-group">
                        <label for="church-addr-edit">Endereço</label>
                        <input type="text" id="church-addr-edit">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeChurchModal()">Cancelar</button>
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
function setupChurchListeners() {
    document.getElementById('church-form')?.addEventListener('submit', handleChurchSubmit);
}

/**
 * Abre o modal de igreja
 * @param {string|null} id - ID da igreja para edição ou null para nova
 */
function openChurchModal(id = null) {
    editingChurchId = id;
    const form = document.getElementById('church-form');
    form.reset();
    document.getElementById('church-modal-title').textContent = id ? 'Editar Igreja' : 'Nova Igreja';
    
    if (id) {
        const church = churchesData.find(c => c.id === id);
        if (church) {
            document.getElementById('church-name-edit').value = church.name;
            document.getElementById('church-desc-edit').value = church.description || '';
            document.getElementById('church-addr-edit').value = church.address || '';
        }
    }
    document.getElementById('church-modal').classList.remove('hidden');
}

/**
 * Abre o modal para editar uma igreja
 * @param {string} id - ID da igreja
 */
function editChurch(id) {
    openChurchModal(id);
}

/**
 * Fecha o modal de igreja
 */
function closeChurchModal() {
    document.getElementById('church-modal').classList.add('hidden');
    editingChurchId = null;
}

/**
 * Manipula o envio do formulário de igreja
 * @param {Event} e - Evento do formulário
 */
async function handleChurchSubmit(e) {
    e.preventDefault();
    showLoading();
    
    const data = {
        name: document.getElementById('church-name-edit').value,
        description: document.getElementById('church-desc-edit').value,
        address: document.getElementById('church-addr-edit').value
    };
    
    try {
        if (editingChurchId) {
            await apiRequest('PUT', `/churches/${editingChurchId}`, data);
            showToast('success', 'Igreja atualizada!', '');
        } else {
            await apiRequest('POST', '/churches', { ...data, companyId: AppState.company?.id });
            showToast('success', 'Igreja criada!', '');
        }
        closeChurchModal();
        await loadSectionContent('churches');
    } catch (error) {
        showToast('error', 'Erro', error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Exclui uma igreja
 * @param {string} id - ID da igreja
 */
async function deleteChurch(id) {
    if (!confirm('Deseja realmente excluir esta igreja?')) return;
    
    showLoading();
    try {
        await apiRequest('DELETE', `/churches/${id}`);
        showToast('success', 'Igreja excluída!', '');
        await loadSectionContent('churches');
    } catch (error) {
        showToast('error', 'Erro', error.message);
    } finally {
        hideLoading();
    }
}

// Exportar para uso global
window.loadChurches = loadChurches;
window.renderChurchesPage = renderChurchesPage;
window.setupChurchListeners = setupChurchListeners;
window.openChurchModal = openChurchModal;
window.editChurch = editChurch;
window.closeChurchModal = closeChurchModal;
window.handleChurchSubmit = handleChurchSubmit;
window.deleteChurch = deleteChurch;

