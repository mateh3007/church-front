// ==========================================
// Empresas
// ==========================================

// Estado local do módulo
let companiesData = [];
let editingCompanyId = null;

/**
 * Carrega a página de empresas
 * @param {HTMLElement} container - Container onde o conteúdo será renderizado
 */
async function loadCompanies(container) {
    container.innerHTML = `<div class="dashboard-loading"><div class="spinner"></div><p>Carregando empresas...</p></div>`;
    
    try {
        companiesData = await apiRequest('GET', '/companies');
        container.innerHTML = renderCompaniesPage(companiesData);
        setupCompanyListeners();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Erro ao carregar empresas</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadSectionContent('companies')">
                    <i class="fas fa-refresh"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

/**
 * Renderiza a página de empresas
 * @param {array} companies - Lista de empresas
 * @returns {string} HTML da página
 */
function renderCompaniesPage(companies) {
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Empresas</h2>
                <p>Organizações cadastradas no sistema</p>
            </div>
        </div>
        
        <div class="card">
            <div class="table-container">
                ${companies.length === 0 ? `
                    <div class="empty-list">
                        <i class="fas fa-building"></i>
                        <p>Nenhuma empresa encontrada</p>
                    </div>
                ` : `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Documento</th>
                                <th>Endereço</th>
                                <th>Status</th>
                                <th class="text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${companies.map(c => `
                                <tr>
                                    <td><strong>${c.name}</strong></td>
                                    <td>${c.document || '-'}</td>
                                    <td>${c.address || '-'}</td>
                                    <td>
                                        <span class="status-badge ${c.onboardingStep === 'COMPLETED' ? 'active' : 'warning'}">
                                            ${c.onboardingStep === 'COMPLETED' ? 'Ativo' : c.onboardingStep}
                                        </span>
                                    </td>
                                    <td class="text-center">
                                        <div class="table-actions">
                                            <button class="btn-icon" onclick="editCompany('${c.id}')" title="Editar">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        </div>
        
        ${renderCompanyModal()}
    `;
}

/**
 * Renderiza o modal de empresa
 * @returns {string} HTML do modal
 */
function renderCompanyModal() {
    return `
        <div id="company-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeCompanyModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Editar Empresa</h3>
                    <button class="modal-close" onclick="closeCompanyModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="company-form" class="modal-body">
                    <div class="form-group">
                        <label for="company-name-edit">Nome *</label>
                        <input type="text" id="company-name-edit" required>
                    </div>
                    <div class="form-group">
                        <label for="company-address-edit">Endereço</label>
                        <input type="text" id="company-address-edit">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeCompanyModal()">Cancelar</button>
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
function setupCompanyListeners() {
    document.getElementById('company-form')?.addEventListener('submit', handleCompanySubmit);
}

/**
 * Abre o modal para editar uma empresa
 * @param {string} id - ID da empresa
 */
function editCompany(id) {
    editingCompanyId = id;
    const company = companiesData.find(c => c.id === id);
    if (company) {
        document.getElementById('company-name-edit').value = company.name;
        document.getElementById('company-address-edit').value = company.address || '';
        document.getElementById('company-modal').classList.remove('hidden');
    }
}

/**
 * Fecha o modal de empresa
 */
function closeCompanyModal() {
    document.getElementById('company-modal').classList.add('hidden');
    editingCompanyId = null;
}

/**
 * Manipula o envio do formulário de empresa
 * @param {Event} e - Evento do formulário
 */
async function handleCompanySubmit(e) {
    e.preventDefault();
    showLoading();
    
    try {
        await apiRequest('PUT', `/companies/${editingCompanyId}`, {
            name: document.getElementById('company-name-edit').value,
            address: document.getElementById('company-address-edit').value
        });
        showToast('success', 'Empresa atualizada!', '');
        closeCompanyModal();
        await loadSectionContent('companies');
    } catch (error) {
        showToast('error', 'Erro', error.message);
    } finally {
        hideLoading();
    }
}

// Exportar para uso global
window.loadCompanies = loadCompanies;
window.renderCompaniesPage = renderCompaniesPage;
window.setupCompanyListeners = setupCompanyListeners;
window.editCompany = editCompany;
window.closeCompanyModal = closeCompanyModal;
window.handleCompanySubmit = handleCompanySubmit;

