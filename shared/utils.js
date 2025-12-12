// ==========================================
// Funções Utilitárias
// ==========================================

/**
 * Formata um valor numérico como moeda brasileira
 * @param {number} value - Valor a ser formatado
 * @returns {string} - Valor formatado (ex: R$ 1.234,56)
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}

/**
 * Formata um valor numérico como moeda abreviada
 * @param {number} value - Valor a ser formatado
 * @returns {string} - Valor formatado (ex: R$ 1.2K)
 */
function formatCurrencyShort(value) {
    if (value >= 1000000) {
        return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
        return `R$ ${(value / 1000).toFixed(1)}K`;
    }
    return `R$ ${value.toFixed(0)}`;
}

/**
 * Formata uma data no padrão brasileiro
 * @param {string} dateStr - String de data
 * @returns {string} - Data formatada (ex: 25/12/2024)
 */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

/**
 * Formata uma hora
 * @param {Date} date - Objeto Date
 * @returns {string} - Hora formatada (ex: 14:30)
 */
function formatTime(date) {
    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

/**
 * Formata uma data para o formato datetime-local (input)
 * @param {Date} date - Objeto Date
 * @returns {string} - Data no formato YYYY-MM-DDTHH:MM
 */
function formatDateTimeLocal(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Retorna o nome abreviado do mês
 * @param {number} month - Índice do mês (0-11)
 * @returns {string} - Nome abreviado do mês
 */
function getMonthShort(month) {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[month];
}

/**
 * Retorna o nome completo do mês
 * @param {number} month - Índice do mês (0-11)
 * @returns {string} - Nome do mês
 */
function getMonthName(month) {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return months[month];
}

/**
 * Alterna a visibilidade de um campo de senha
 * @param {string} inputId - ID do input de senha
 */
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.parentElement.querySelector('.toggle-password i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Exportar para uso global
window.formatCurrency = formatCurrency;
window.formatCurrencyShort = formatCurrencyShort;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.formatDateTimeLocal = formatDateTimeLocal;
window.getMonthShort = getMonthShort;
window.getMonthName = getMonthName;
window.togglePassword = togglePassword;

