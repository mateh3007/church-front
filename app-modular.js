// ==========================================
// Inicialização da Aplicação Modular
// ==========================================

/**
 * Inicializa a aplicação
 */
function initApp() {
    // Verificar se há token salvo e se é válido
    if (AppState.isAuthenticated()) {
        verifyToken();
    } else {
        showScreen('login-screen');
    }
}

/**
 * Configura todos os event listeners da aplicação
 */
function setupEventListeners() {
    // Inicializar módulos de autenticação
    initLogin();
    initOnboarding();
    
    // Sidebar Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavigation);
    });
}

/**
 * Manipula a navegação pelo sidebar
 * @param {Event} e - Evento de clique
 */
function handleNavigation(e) {
    e.preventDefault();
    
    const section = e.currentTarget.dataset.section;
    
    // Atualizar item ativo
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
    
    // Atualizar título
    document.getElementById('page-title').textContent = getSectionTitle(section);
    
    // Carregar conteúdo da seção
    loadSectionContent(section);
}

/**
 * Atualiza as informações do usuário na interface
 */
function updateUserInfo() {
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');
    const currentChurch = document.getElementById('current-church');
    
    if (userName && AppState.user) {
        userName.textContent = AppState.user.name || 'Usuário';
    }
    
    if (userRole && AppState.user) {
        const roleNames = {
            'SUPER_ADMIN': 'Super Admin',
            'ADMIN': 'Administrador',
            'LEADER': 'Líder',
            'TREASURER': 'Tesoureiro',
            'MEMBER': 'Membro'
        };
        userRole.textContent = roleNames[AppState.user.role] || AppState.user.role;
    }
    
    if (currentChurch && AppState.church) {
        currentChurch.textContent = AppState.church.name || 'Igreja não selecionada';
    }
    
    // Carregar dashboard por padrão
    loadSectionContent('dashboard');
}

/**
 * Carrega o conteúdo de uma seção específica
 * @param {string} section - Nome da seção
 */
async function loadSectionContent(section) {
    const contentArea = document.getElementById('content-area');
    
    switch (section) {
        case 'dashboard':
            await loadDashboard(contentArea);
            break;
        case 'categories':
            // Será modularizado posteriormente - usa versão legacy
            if (typeof loadCategories === 'function') {
                await loadCategories(contentArea);
            }
            break;
        case 'entries':
            if (typeof loadEntries === 'function') {
                await loadEntries(contentArea);
            }
            break;
        case 'recurring':
            if (typeof loadRecurringEntries === 'function') {
                await loadRecurringEntries(contentArea);
            }
            break;
        case 'reports':
            if (typeof loadReports === 'function') {
                await loadReports(contentArea);
            }
            break;
        case 'events':
            if (typeof loadEvents === 'function') {
                await loadEvents(contentArea);
            }
            break;
        case 'recurring-events':
            if (typeof loadRecurringEvents === 'function') {
                await loadRecurringEvents(contentArea);
            }
            break;
        case 'companies':
            if (typeof loadCompanies === 'function') {
                await loadCompanies(contentArea);
            }
            break;
        case 'churches':
            if (typeof loadChurches === 'function') {
                await loadChurches(contentArea);
            }
            break;
        case 'users':
            if (typeof loadUsers === 'function') {
                await loadUsers(contentArea);
            }
            break;
        case 'ministries':
            if (typeof loadMinistries === 'function') {
                await loadMinistries(contentArea);
            }
            break;
        default:
            contentArea.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tools"></i>
                    <h3>Em desenvolvimento</h3>
                    <p>Esta seção será implementada em breve</p>
                </div>
            `;
    }
}

// ==========================================
// Inicialização
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

// Exportar para uso global
window.initApp = initApp;
window.setupEventListeners = setupEventListeners;
window.handleNavigation = handleNavigation;
window.updateUserInfo = updateUserInfo;
window.loadSectionContent = loadSectionContent;

