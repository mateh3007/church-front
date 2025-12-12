// ==========================================
// Login - Lógica de autenticação
// ==========================================

/**
 * Inicializa os event listeners do login
 */
function initLogin() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

/**
 * Manipula o envio do formulário de login
 * @param {Event} e - Evento do formulário
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    showLoading();
    
    try {
        const response = await apiRequest('POST', '/auth/login', { email, password });
        
        AppState.setToken(response.accessToken);
        AppState.setUser(response.user);
        
        showToast('success', 'Login realizado!', 'Bem-vindo de volta!');
        
        // Buscar dados da igreja se o usuário tiver churchId
        if (response.user.churchId) {
            await fetchChurchData(response.user.churchId);
        }
        
        // Verificar status do onboarding (apenas para admins)
        if (response.user.role === 'ADMIN') {
            await checkOnboardingStatus();
        } else {
            showScreen('dashboard-screen');
            updateUserInfo();
        }
        
    } catch (error) {
        showToast('error', 'Erro no login', error.message || 'Verifique suas credenciais');
    } finally {
        hideLoading();
    }
}

/**
 * Busca os dados de uma igreja específica
 * @param {string} churchId - ID da igreja
 */
async function fetchChurchData(churchId) {
    try {
        const church = await apiRequest('GET', `/churches/${churchId}`);
        AppState.setChurch(church);
    } catch (error) {
        console.warn('Não foi possível buscar dados da igreja:', error);
    }
}

/**
 * Verifica o status do onboarding do usuário
 */
async function checkOnboardingStatus() {
    try {
        const status = await apiRequest('GET', '/onboarding/status');
        
        // Salvar dados da empresa
        AppState.setCompany({
            id: status.companyId,
            name: status.companyName
        });
        
        if (status.onboardingStep === 'PENDING_CHURCH' || !status.hasChurches) {
            // Precisa criar igreja ainda
            AppState.onboarding.step = 3;
            showScreen('onboarding-screen');
            goToStep(3);
        } else {
            // Onboarding completo - buscar igrejas da empresa
            if (!AppState.church) {
                await fetchCompanyChurches();
            }
            showScreen('dashboard-screen');
            updateUserInfo();
        }
    } catch (error) {
        // Se der erro (403 para não-admin ou outro), vai pro dashboard
        showScreen('dashboard-screen');
        updateUserInfo();
    }
}

/**
 * Busca as igrejas da empresa do usuário
 */
async function fetchCompanyChurches() {
    try {
        const churches = await apiRequest('GET', '/churches');
        if (churches && churches.length > 0) {
            // Usar a primeira igreja ou a igreja do usuário
            const userChurchId = AppState.user?.churchId;
            const church = userChurchId 
                ? churches.find(c => c.id === userChurchId) || churches[0]
                : churches[0];
            
            AppState.setChurch(church);
        }
    } catch (error) {
        console.warn('Não foi possível buscar igrejas:', error);
    }
}

/**
 * Verifica o token salvo e faz login automático
 */
async function verifyToken() {
    showLoading();
    try {
        const response = await apiRequest('GET', '/auth/me');
        AppState.setUser(response);
        
        // Buscar dados da igreja se não estiver no estado
        if (!AppState.church && response.churchId) {
            await fetchChurchData(response.churchId);
        }
        
        // Se ainda não tiver igreja e for admin, buscar igrejas da empresa
        if (!AppState.church && response.role === 'ADMIN') {
            await fetchCompanyChurches();
        }
        
        showScreen('dashboard-screen');
        updateUserInfo();
    } catch (error) {
        // Token inválido, limpar e mostrar login
        logout();
    } finally {
        hideLoading();
    }
}

/**
 * Realiza o logout do usuário
 */
function logout() {
    AppState.clear();
    showScreen('login-screen');
    
    // Limpar formulários
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.reset();
    
    const onboardingForms = ['onboarding-step1', 'onboarding-step2', 'onboarding-step3'];
    onboardingForms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) form.reset();
    });
}

// Exportar para uso global
window.initLogin = initLogin;
window.handleLogin = handleLogin;
window.fetchChurchData = fetchChurchData;
window.checkOnboardingStatus = checkOnboardingStatus;
window.fetchCompanyChurches = fetchCompanyChurches;
window.verifyToken = verifyToken;
window.logout = logout;

