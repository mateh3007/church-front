// ==========================================
// Onboarding - Criação de organização
// ==========================================

/**
 * Inicializa os event listeners do onboarding
 */
function initOnboarding() {
    const step1Form = document.getElementById('onboarding-step1');
    const step2Form = document.getElementById('onboarding-step2');
    const step3Form = document.getElementById('onboarding-step3');
    
    if (step1Form) step1Form.addEventListener('submit', handleOnboardingStep1);
    if (step2Form) step2Form.addEventListener('submit', handleOnboardingStep2);
    if (step3Form) step3Form.addEventListener('submit', handleOnboardingStep3);
}

/**
 * Manipula o Step 1 - Dados da Organização
 * @param {Event} e - Evento do formulário
 */
async function handleOnboardingStep1(e) {
    e.preventDefault();
    
    AppState.onboarding.companyData = {
        companyName: document.getElementById('company-name').value,
        companyDocument: document.getElementById('company-document').value,
        companyAddress: document.getElementById('company-address').value
    };
    
    goToStep(2);
}

/**
 * Manipula o Step 2 - Dados do Admin
 * @param {Event} e - Evento do formulário
 */
async function handleOnboardingStep2(e) {
    e.preventDefault();
    
    const password = document.getElementById('admin-password').value;
    const confirmPassword = document.getElementById('admin-password-confirm').value;
    
    if (password !== confirmPassword) {
        showToast('error', 'Erro', 'As senhas não conferem');
        return;
    }
    
    AppState.onboarding.userData = {
        adminName: document.getElementById('admin-name').value,
        adminEmail: document.getElementById('admin-email').value,
        adminPassword: password
    };
    
    showLoading();
    
    try {
        // Enviar dados de onboarding
        const data = {
            ...AppState.onboarding.companyData,
            ...AppState.onboarding.userData
        };
        
        const response = await apiRequest('POST', '/onboarding/start', data);
        
        AppState.setToken(response.accessToken);
        AppState.setUser(response.user);
        AppState.setCompany(response.company);
        
        showToast('success', 'Conta criada!', 'Agora vamos configurar sua igreja');
        goToStep(3);
        
    } catch (error) {
        showToast('error', 'Erro no cadastro', error.message || 'Tente novamente');
    } finally {
        hideLoading();
    }
}

/**
 * Manipula o Step 3 - Criar Igreja
 * @param {Event} e - Evento do formulário
 */
async function handleOnboardingStep3(e) {
    e.preventDefault();
    
    const churchData = {
        name: document.getElementById('church-name').value,
        description: document.getElementById('church-description').value,
        address: document.getElementById('church-address').value
    };
    
    showLoading();
    
    try {
        const response = await apiRequest('POST', '/onboarding/church', churchData);
        
        AppState.setChurch(response.church);
        
        showToast('success', 'Configuração concluída!', 'Sua igreja foi criada com sucesso');
        
        showScreen('dashboard-screen');
        updateUserInfo();
        
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível criar a igreja');
    } finally {
        hideLoading();
    }
}

/**
 * Navega para um step específico do onboarding
 * @param {number} step - Número do step (1, 2 ou 3)
 */
function goToStep(step) {
    AppState.onboarding.step = step;
    
    // Esconder todos os formulários
    document.getElementById('onboarding-step1').classList.add('hidden');
    document.getElementById('onboarding-step2').classList.add('hidden');
    document.getElementById('onboarding-step3').classList.add('hidden');
    
    // Mostrar formulário atual
    document.getElementById(`onboarding-step${step}`).classList.remove('hidden');
    
    // Atualizar indicadores de progresso
    document.querySelectorAll('.progress-steps .step').forEach((stepEl, index) => {
        stepEl.classList.remove('active', 'completed');
        
        if (index + 1 < step) {
            stepEl.classList.add('completed');
        } else if (index + 1 === step) {
            stepEl.classList.add('active');
        }
    });
}

// Exportar para uso global
window.initOnboarding = initOnboarding;
window.handleOnboardingStep1 = handleOnboardingStep1;
window.handleOnboardingStep2 = handleOnboardingStep2;
window.handleOnboardingStep3 = handleOnboardingStep3;
window.goToStep = goToStep;

