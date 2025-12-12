// ==========================================
// Sistema de Notificações Toast
// ==========================================

/**
 * Exibe uma notificação toast
 * @param {string} type - Tipo do toast (success, error, warning, info)
 * @param {string} title - Título da notificação
 * @param {string} message - Mensagem da notificação
 */
function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <div class="toast-content">
            <strong>${title}</strong>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="closeToast(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

/**
 * Fecha um toast específico
 * @param {HTMLElement} button - Botão de fechar
 */
function closeToast(button) {
    const toast = button.closest('.toast');
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
}

/**
 * Exibe o overlay de carregamento
 */
function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

/**
 * Esconde o overlay de carregamento
 */
function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

// Exportar para uso global
window.showToast = showToast;
window.closeToast = closeToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

