// ==========================================
// Estado Global da Aplicação
// ==========================================

const AppState = {
    // Dados de autenticação
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    company: JSON.parse(localStorage.getItem('company') || 'null'),
    church: JSON.parse(localStorage.getItem('church') || 'null'),
    
    // Estado do onboarding
    onboarding: {
        step: 1,
        companyData: null,
        userData: null
    },

    // Métodos para persistência
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    },

    setUser(user) {
        this.user = user;
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    },

    setCompany(company) {
        this.company = company;
        if (company) {
            localStorage.setItem('company', JSON.stringify(company));
        } else {
            localStorage.removeItem('company');
        }
    },

    setChurch(church) {
        this.church = church;
        if (church) {
            localStorage.setItem('church', JSON.stringify(church));
        } else {
            localStorage.removeItem('church');
        }
    },

    // Limpar todo o estado (logout)
    clear() {
        this.token = null;
        this.user = null;
        this.company = null;
        this.church = null;
        this.onboarding = {
            step: 1,
            companyData: null,
            userData: null
        };
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('company');
        localStorage.removeItem('church');
    },

    // Verificar se está autenticado
    isAuthenticated() {
        return !!this.token;
    }
};

// Exportar para uso global
window.AppState = AppState;

