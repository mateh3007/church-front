// ==========================================
// Usuários
// ==========================================

// Estado local do módulo
let usersData = [];
let usersChurchesData = [];
let editingUserId = null;

// Mapeamento de funções
const userRoles = {
    ADMIN: { label: 'Administrador', color: 'danger' },
    PASTOR: { label: 'Pastor', color: 'primary' },
    SECRETARY: { label: 'Secretário', color: 'warning' },
    LEADER: { label: 'Líder', color: 'info' },
    MEMBER: { label: 'Membro', color: 'gray' }
};

/**
 * Carrega a página de usuários
 * @param {HTMLElement} container - Container onde o conteúdo será renderizado
 */
async function loadUsers(container) {
    container.innerHTML = `<div class="dashboard-loading"><div class="spinner"></div><p>Carregando usuários...</p></div>`;
    
    try {
        const [users, churches] = await Promise.all([
            apiRequest('GET', '/users'),
            apiRequest('GET', '/churches').catch(() => [])
        ]);
        usersData = users || [];
        usersChurchesData = churches || [];
        container.innerHTML = renderUsersPage(usersData);
        setupUserListeners();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Erro ao carregar usuários</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadSectionContent('users')">
                    <i class="fas fa-refresh"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

/**
 * Renderiza a página de usuários
 * @param {array} users - Lista de usuários
 * @returns {string} HTML da página
 */
function renderUsersPage(users) {
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Usuários</h2>
                <p>Gerenciar usuários do sistema</p>
            </div>
            <button class="btn btn-primary" onclick="openUserModal()">
                <i class="fas fa-plus"></i> Novo Usuário
            </button>
        </div>
        
        <div class="card">
            <div class="table-container">
                ${users.length === 0 ? `
                    <div class="empty-list">
                        <i class="fas fa-users"></i>
                        <p>Nenhum usuário encontrado</p>
                    </div>
                ` : `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Usuário</th>
                                <th>Email</th>
                                <th>Função</th>
                                <th>Igreja</th>
                                <th>Status</th>
                                <th class="text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => {
                                const role = userRoles[u.role] || userRoles.MEMBER;
                                return `
                                    <tr>
                                        <td>
                                            <div class="user-cell">
                                                <div class="user-avatar-sm">
                                                    <i class="fas fa-user"></i>
                                                </div>
                                                <strong>${u.name}</strong>
                                            </div>
                                        </td>
                                        <td>${u.email}</td>
                                        <td>
                                            <span class="role-badge ${role.color}">${role.label}</span>
                                        </td>
                                        <td>${u.church?.name || '-'}</td>
                                        <td>
                                            <span class="status-badge ${u.active !== false ? 'active' : 'inactive'}">
                                                ${u.active !== false ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td class="text-center">
                                            <div class="table-actions">
                                                <button class="btn-icon" onclick="editUser('${u.id}')" title="Editar">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn-icon danger" onclick="deleteUser('${u.id}')" title="Excluir">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        </div>
        
        ${renderUserModal()}
    `;
}

/**
 * Renderiza o modal de usuário
 * @returns {string} HTML do modal
 */
function renderUserModal() {
    return `
        <div id="user-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeUserModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="user-modal-title">Novo Usuário</h3>
                    <button class="modal-close" onclick="closeUserModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="user-form" class="modal-body">
                    <div class="form-group">
                        <label for="user-name-edit">Nome *</label>
                        <input type="text" id="user-name-edit" required>
                    </div>
                    <div class="form-group">
                        <label for="user-email-edit">Email *</label>
                        <input type="email" id="user-email-edit" required>
                    </div>
                    <div class="form-group" id="user-password-group">
                        <label for="user-password-edit">Senha *</label>
                        <input type="password" id="user-password-edit" minlength="6">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="user-role-edit">Função *</label>
                            <select id="user-role-edit" required>
                                <option value="ADMIN">Administrador</option>
                                <option value="PASTOR">Pastor</option>
                                <option value="SECRETARY">Secretário</option>
                                <option value="LEADER">Líder</option>
                                <option value="MEMBER">Membro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="user-church-edit">Igreja *</label>
                            <select id="user-church-edit" required>
                                ${usersChurchesData.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="user-active-edit" checked>
                            <span>Usuário ativo</span>
                        </label>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeUserModal()">Cancelar</button>
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
function setupUserListeners() {
    document.getElementById('user-form')?.addEventListener('submit', handleUserSubmit);
}

/**
 * Abre o modal de usuário
 * @param {string|null} id - ID do usuário para edição ou null para novo
 */
function openUserModal(id = null) {
    editingUserId = id;
    const form = document.getElementById('user-form');
    form.reset();
    document.getElementById('user-modal-title').textContent = id ? 'Editar Usuário' : 'Novo Usuário';
    document.getElementById('user-password-group').style.display = id ? 'none' : 'block';
    document.getElementById('user-active-edit').checked = true;
    
    if (id) {
        const user = usersData.find(u => u.id === id);
        if (user) {
            document.getElementById('user-name-edit').value = user.name;
            document.getElementById('user-email-edit').value = user.email;
            document.getElementById('user-role-edit').value = user.role;
            document.getElementById('user-church-edit').value = user.churchId || '';
            document.getElementById('user-active-edit').checked = user.active !== false;
        }
    }
    document.getElementById('user-modal').classList.remove('hidden');
}

/**
 * Abre o modal para editar um usuário
 * @param {string} id - ID do usuário
 */
function editUser(id) {
    openUserModal(id);
}

/**
 * Fecha o modal de usuário
 */
function closeUserModal() {
    document.getElementById('user-modal').classList.add('hidden');
    editingUserId = null;
}

/**
 * Manipula o envio do formulário de usuário
 * @param {Event} e - Evento do formulário
 */
async function handleUserSubmit(e) {
    e.preventDefault();
    showLoading();
    
    const data = {
        name: document.getElementById('user-name-edit').value,
        email: document.getElementById('user-email-edit').value,
        role: document.getElementById('user-role-edit').value,
        churchId: document.getElementById('user-church-edit').value,
        active: document.getElementById('user-active-edit').checked
    };
    
    if (!editingUserId) {
        data.password = document.getElementById('user-password-edit').value;
    }
    
    try {
        if (editingUserId) {
            await apiRequest('PUT', `/users/${editingUserId}`, data);
            showToast('success', 'Usuário atualizado!', '');
        } else {
            await apiRequest('POST', '/users', data);
            showToast('success', 'Usuário criado!', '');
        }
        closeUserModal();
        await loadSectionContent('users');
    } catch (error) {
        showToast('error', 'Erro', error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Exclui um usuário
 * @param {string} id - ID do usuário
 */
async function deleteUser(id) {
    if (!confirm('Deseja realmente excluir este usuário?')) return;
    
    showLoading();
    try {
        await apiRequest('DELETE', `/users/${id}`);
        showToast('success', 'Usuário excluído!', '');
        await loadSectionContent('users');
    } catch (error) {
        showToast('error', 'Erro', error.message);
    } finally {
        hideLoading();
    }
}

// Exportar para uso global
window.loadUsers = loadUsers;
window.renderUsersPage = renderUsersPage;
window.setupUserListeners = setupUserListeners;
window.openUserModal = openUserModal;
window.editUser = editUser;
window.closeUserModal = closeUserModal;
window.handleUserSubmit = handleUserSubmit;
window.deleteUser = deleteUser;
window.userRoles = userRoles;

