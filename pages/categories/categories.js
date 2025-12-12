// ==========================================
// Categorias Financeiras
// ==========================================

// Estado local do módulo
let categoriesData = [];
let editingCategoryId = null;

/**
 * Carrega a página de categorias
 * @param {HTMLElement} container - Container onde o conteúdo será renderizado
 */
async function loadCategories(container) {
    container.innerHTML = `
        <div class="dashboard-loading">
            <div class="spinner"></div>
            <p>Carregando categorias...</p>
        </div>
    `;
    
    try {
        categoriesData = await apiRequest('GET', '/financial-categories');
        container.innerHTML = renderCategoriesPage(categoriesData);
        setupCategoryEventListeners();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Erro ao carregar categorias</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadSectionContent('categories')">
                    <i class="fas fa-refresh"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

/**
 * Renderiza a página de categorias
 * @param {array} categories - Lista de categorias
 * @returns {string} HTML da página
 */
function renderCategoriesPage(categories) {
    const incomeCategories = categories.filter(c => c.type === 'INCOME' && !c.parentId);
    const expenseCategories = categories.filter(c => c.type === 'EXPENSE' && !c.parentId);
    
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Categorias Financeiras</h2>
                <p>Gerencie as categorias de receitas e despesas</p>
            </div>
            <button class="btn btn-primary" onclick="openCategoryModal()">
                <i class="fas fa-plus"></i>
                Nova Categoria
            </button>
        </div>
        
        <div class="categories-grid">
            <!-- Categorias de Receita -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-arrow-up" style="color: var(--success)"></i> Receitas</h3>
                    <span class="badge badge-success">${incomeCategories.length}</span>
                </div>
                <div class="card-body">
                    ${renderCategoryList(incomeCategories, categories, 'INCOME')}
                </div>
            </div>
            
            <!-- Categorias de Despesa -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-arrow-down" style="color: var(--danger)"></i> Despesas</h3>
                    <span class="badge badge-danger">${expenseCategories.length}</span>
                </div>
                <div class="card-body">
                    ${renderCategoryList(expenseCategories, categories, 'EXPENSE')}
                </div>
            </div>
        </div>
        
        <!-- Modal de Categoria -->
        ${renderCategoryModal()}
    `;
}

/**
 * Renderiza a lista de categorias
 * @param {array} categories - Lista de categorias
 * @param {array} allCategories - Todas as categorias (para subcategorias)
 * @param {string} type - Tipo (INCOME/EXPENSE)
 * @returns {string} HTML da lista
 */
function renderCategoryList(categories, allCategories, type) {
    if (categories.length === 0) {
        return `
            <div class="empty-list">
                <i class="fas fa-folder-open"></i>
                <p>Nenhuma categoria cadastrada</p>
            </div>
        `;
    }
    
    return `
        <ul class="category-list">
            ${categories.map(cat => {
                const subcategories = allCategories.filter(c => c.parentId === cat.id);
                return `
                    <li class="category-item">
                        <div class="category-item-main">
                            <span class="category-icon ${type.toLowerCase()}">
                                <i class="fas fa-tag"></i>
                            </span>
                            <span class="category-name">${cat.name}</span>
                            <div class="category-actions">
                                <button class="btn-icon" onclick="editCategory('${cat.id}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon danger" onclick="deleteCategory('${cat.id}', '${cat.name}')" title="Excluir">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        ${subcategories.length > 0 ? `
                            <ul class="subcategory-list">
                                ${subcategories.map(sub => `
                                    <li class="subcategory-item">
                                        <span class="subcategory-icon">
                                            <i class="fas fa-folder"></i>
                                        </span>
                                        <span class="category-name">${sub.name}</span>
                                        <div class="category-actions">
                                            <button class="btn-icon" onclick="editCategory('${sub.id}')" title="Editar">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn-icon danger" onclick="deleteCategory('${sub.id}', '${sub.name}')" title="Excluir">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </li>
                                `).join('')}
                            </ul>
                        ` : ''}
                    </li>
                `;
            }).join('')}
        </ul>
    `;
}

/**
 * Renderiza o modal de categoria
 * @returns {string} HTML do modal
 */
function renderCategoryModal() {
    return `
        <div id="category-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeCategoryModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="category-modal-title">Nova Categoria</h3>
                    <button class="modal-close" onclick="closeCategoryModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="category-form" class="modal-body">
                    <div class="form-group">
                        <label for="category-name">Nome da Categoria</label>
                        <input type="text" id="category-name" placeholder="Ex: Dízimo, Oferta, Aluguel..." required>
                    </div>
                    
                    <div class="form-group">
                        <label for="category-type">Tipo</label>
                        <select id="category-type" required>
                            <option value="">Selecione o tipo</option>
                            <option value="INCOME">Receita</option>
                            <option value="EXPENSE">Despesa</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="category-parent">Categoria Pai (opcional)</label>
                        <select id="category-parent">
                            <option value="">Nenhuma (categoria principal)</option>
                        </select>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeCategoryModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary" id="category-submit-btn">
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
function setupCategoryEventListeners() {
    const form = document.getElementById('category-form');
    if (form) {
        form.addEventListener('submit', handleCategorySubmit);
    }
    
    const typeSelect = document.getElementById('category-type');
    if (typeSelect) {
        typeSelect.addEventListener('change', updateParentCategoryOptions);
    }
}

/**
 * Atualiza as opções de categoria pai baseado no tipo selecionado
 */
function updateParentCategoryOptions() {
    const type = document.getElementById('category-type').value;
    const parentSelect = document.getElementById('category-parent');
    
    // Filtrar categorias do mesmo tipo (apenas principais)
    const parentOptions = categoriesData.filter(c => c.type === type && !c.parentId && c.id !== editingCategoryId);
    
    parentSelect.innerHTML = `
        <option value="">Nenhuma (categoria principal)</option>
        ${parentOptions.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
    `;
}

/**
 * Abre o modal de categoria
 * @param {string|null} categoryId - ID da categoria para edição ou null para nova
 */
function openCategoryModal(categoryId = null) {
    editingCategoryId = categoryId;
    const modal = document.getElementById('category-modal');
    const title = document.getElementById('category-modal-title');
    const form = document.getElementById('category-form');
    
    form.reset();
    
    if (categoryId) {
        title.textContent = 'Editar Categoria';
        const category = categoriesData.find(c => c.id === categoryId);
        if (category) {
            document.getElementById('category-name').value = category.name;
            document.getElementById('category-type').value = category.type;
            updateParentCategoryOptions();
            document.getElementById('category-parent').value = category.parentId || '';
        }
    } else {
        title.textContent = 'Nova Categoria';
    }
    
    modal.classList.remove('hidden');
}

/**
 * Fecha o modal de categoria
 */
function closeCategoryModal() {
    const modal = document.getElementById('category-modal');
    modal.classList.add('hidden');
    editingCategoryId = null;
}

/**
 * Manipula o envio do formulário de categoria
 * @param {Event} e - Evento do formulário
 */
async function handleCategorySubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('category-name').value;
    const type = document.getElementById('category-type').value;
    const parentId = document.getElementById('category-parent').value || null;
    
    const data = {
        churchId: AppState.church?.id,
        name,
        type,
        parentId
    };
    
    showLoading();
    
    try {
        if (editingCategoryId) {
            await apiRequest('PUT', `/financial-categories/${editingCategoryId}`, { name, parentId });
            showToast('success', 'Categoria atualizada!', '');
        } else {
            await apiRequest('POST', '/financial-categories', data);
            showToast('success', 'Categoria criada!', '');
        }
        
        closeCategoryModal();
        await loadSectionContent('categories');
        
    } catch (error) {
        showToast('error', 'Erro', error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Abre o modal para editar uma categoria
 * @param {string} categoryId - ID da categoria
 */
function editCategory(categoryId) {
    openCategoryModal(categoryId);
}

/**
 * Exclui uma categoria
 * @param {string} categoryId - ID da categoria
 * @param {string} categoryName - Nome da categoria
 */
async function deleteCategory(categoryId, categoryName) {
    if (!confirm(`Deseja realmente excluir a categoria "${categoryName}"?`)) {
        return;
    }
    
    showLoading();
    
    try {
        await apiRequest('DELETE', `/financial-categories/${categoryId}`);
        showToast('success', 'Categoria excluída!', 'A categoria foi removida com sucesso.');
        await loadSectionContent('categories');
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível excluir a categoria.');
    } finally {
        hideLoading();
    }
}

// Exportar para uso global
window.loadCategories = loadCategories;
window.renderCategoriesPage = renderCategoriesPage;
window.renderCategoryList = renderCategoryList;
window.renderCategoryModal = renderCategoryModal;
window.setupCategoryEventListeners = setupCategoryEventListeners;
window.updateParentCategoryOptions = updateParentCategoryOptions;
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.handleCategorySubmit = handleCategorySubmit;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.categoriesData = categoriesData;

