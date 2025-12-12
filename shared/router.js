// ==========================================
// Sistema de Navegação / Router
// ==========================================

/**
 * Mostra uma tela específica (login, onboarding, dashboard)
 * @param {string} screenId - ID da tela a ser exibida
 */
function showScreen(screenId) {
    document.querySelectorAll('#app > div').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

/**
 * Carrega o conteúdo de uma página HTML
 * @param {string} url - URL do arquivo HTML
 * @param {string} containerId - ID do container onde o HTML será inserido
 * @returns {Promise<void>}
 */
async function loadPage(url, containerId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Página não encontrada');
        
        const html = await response.text();
        document.getElementById(containerId).innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar página:', error);
        document.getElementById(containerId).innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Erro ao carregar</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Mapeamento de seções para títulos
const sectionTitles = {
    dashboard: 'Dashboard',
    companies: 'Empresas',
    churches: 'Igrejas',
    users: 'Usuários',
    ministries: 'Ministérios',
    categories: 'Categorias Financeiras',
    entries: 'Lançamentos Financeiros',
    recurring: 'Lançamentos Recorrentes',
    reports: 'Relatórios',
    events: 'Eventos',
    'recurring-events': 'Eventos Recorrentes'
};

/**
 * Obtém o título de uma seção
 * @param {string} section - Nome da seção
 * @returns {string} - Título da seção
 */
function getSectionTitle(section) {
    return sectionTitles[section] || 'Dashboard';
}

// Exportar para uso global
window.showScreen = showScreen;
window.loadPage = loadPage;
window.getSectionTitle = getSectionTitle;

