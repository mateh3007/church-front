// ==========================================
// Configuração e Funções da API
// ==========================================

const API_BASE_URL = 'http://localhost:3000';

/**
 * Função principal para fazer requisições à API
 * @param {string} method - Método HTTP (GET, POST, PUT, DELETE, PATCH)
 * @param {string} endpoint - Endpoint da API
 * @param {object|null} data - Dados a serem enviados
 * @returns {Promise<any>} - Resposta da API
 */
async function apiRequest(method, endpoint, data = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (AppState.token) {
        headers['Authorization'] = `Bearer ${AppState.token}`;
    }
    
    const config = {
        method,
        headers
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    const responseData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
        throw new Error(responseData.message || `Erro ${response.status}`);
    }
    
    return responseData;
}

// Exportar para uso global
window.apiRequest = apiRequest;
window.API_BASE_URL = API_BASE_URL;

