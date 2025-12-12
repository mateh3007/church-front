// ==========================================
// Configuração da API
// ==========================================
const API_BASE_URL = 'http://localhost:3000';

// ==========================================
// Estado da Aplicação
// ==========================================
const state = {
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    company: JSON.parse(localStorage.getItem('company') || 'null'),
    church: JSON.parse(localStorage.getItem('church') || 'null'),
    onboarding: {
        step: 1,
        companyData: null,
        userData: null
    }
};

// ==========================================
// Inicialização
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

function initApp() {
    // Verificar se há token salvo e se é válido
    if (state.token) {
        verifyToken();
    } else {
        showScreen('login-screen');
    }
}

async function verifyToken() {
    showLoading();
    try {
        const response = await apiRequest('GET', '/auth/me');
        state.user = response;
        localStorage.setItem('user', JSON.stringify(response));
        
        // Buscar dados da igreja se não estiver no estado
        if (!state.church && response.churchId) {
            await fetchChurchData(response.churchId);
        }
        
        // Se ainda não tiver igreja e for admin, buscar igrejas da empresa
        if (!state.church && response.role === 'ADMIN') {
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

// ==========================================
// Event Listeners
// ==========================================
function setupEventListeners() {
    // Login Form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Onboarding Steps
    document.getElementById('onboarding-step1').addEventListener('submit', handleOnboardingStep1);
    document.getElementById('onboarding-step2').addEventListener('submit', handleOnboardingStep2);
    document.getElementById('onboarding-step3').addEventListener('submit', handleOnboardingStep3);
    
    // Sidebar Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavigation);
    });
}

// ==========================================
// Autenticação - Login
// ==========================================
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    showLoading();
    
    try {
        const response = await apiRequest('POST', '/auth/login', { email, password });
        
        state.token = response.accessToken;
        state.user = response.user;
        
        localStorage.setItem('token', response.accessToken);
        localStorage.setItem('user', JSON.stringify(response.user));
        
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

async function fetchChurchData(churchId) {
    try {
        const church = await apiRequest('GET', `/churches/${churchId}`);
        state.church = church;
        localStorage.setItem('church', JSON.stringify(church));
    } catch (error) {
        console.warn('Não foi possível buscar dados da igreja:', error);
    }
}

async function checkOnboardingStatus() {
    try {
        const status = await apiRequest('GET', '/onboarding/status');
        
        // Salvar dados da empresa
        state.company = {
            id: status.companyId,
            name: status.companyName
        };
        localStorage.setItem('company', JSON.stringify(state.company));
        
        if (status.onboardingStep === 'PENDING_CHURCH' || !status.hasChurches) {
            // Precisa criar igreja ainda
            state.onboarding.step = 3;
            showScreen('onboarding-screen');
            goToStep(3);
        } else {
            // Onboarding completo - buscar igrejas da empresa
            if (!state.church) {
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

async function fetchCompanyChurches() {
    try {
        const churches = await apiRequest('GET', '/churches');
        if (churches && churches.length > 0) {
            // Usar a primeira igreja ou a igreja do usuário
            const userChurchId = state.user?.churchId;
            const church = userChurchId 
                ? churches.find(c => c.id === userChurchId) || churches[0]
                : churches[0];
            
            state.church = church;
            localStorage.setItem('church', JSON.stringify(church));
        }
    } catch (error) {
        console.warn('Não foi possível buscar igrejas:', error);
    }
}

// ==========================================
// Onboarding
// ==========================================
async function handleOnboardingStep1(e) {
    e.preventDefault();
    
    state.onboarding.companyData = {
        companyName: document.getElementById('company-name').value,
        companyDocument: document.getElementById('company-document').value,
        companyAddress: document.getElementById('company-address').value
    };
    
    goToStep(2);
}

async function handleOnboardingStep2(e) {
    e.preventDefault();
    
    const password = document.getElementById('admin-password').value;
    const confirmPassword = document.getElementById('admin-password-confirm').value;
    
    if (password !== confirmPassword) {
        showToast('error', 'Erro', 'As senhas não conferem');
        return;
    }
    
    state.onboarding.userData = {
        adminName: document.getElementById('admin-name').value,
        adminEmail: document.getElementById('admin-email').value,
        adminPassword: password
    };
    
    showLoading();
    
    try {
        // Enviar dados de onboarding
        const data = {
            ...state.onboarding.companyData,
            ...state.onboarding.userData
        };
        
        const response = await apiRequest('POST', '/onboarding/start', data);
        
        state.token = response.accessToken;
        state.user = response.user;
        state.company = response.company;
        
        localStorage.setItem('token', response.accessToken);
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('company', JSON.stringify(response.company));
        
        showToast('success', 'Conta criada!', 'Agora vamos configurar sua igreja');
        goToStep(3);
        
    } catch (error) {
        showToast('error', 'Erro no cadastro', error.message || 'Tente novamente');
    } finally {
        hideLoading();
    }
}

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
        
        state.church = response.church;
        localStorage.setItem('church', JSON.stringify(response.church));
        
        showToast('success', 'Configuração concluída!', 'Sua igreja foi criada com sucesso');
        
        showScreen('dashboard-screen');
        updateUserInfo();
        
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível criar a igreja');
    } finally {
        hideLoading();
    }
}

function goToStep(step) {
    state.onboarding.step = step;
    
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

// ==========================================
// Navegação
// ==========================================
function showScreen(screenId) {
    document.querySelectorAll('#app > div').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

function handleNavigation(e) {
    e.preventDefault();
    
    const section = e.currentTarget.dataset.section;
    
    // Atualizar item ativo
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
    
    // Atualizar título
    const titles = {
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
    
    document.getElementById('page-title').textContent = titles[section] || 'Dashboard';
    
    // Carregar conteúdo (será implementado nos próximos passos)
    loadSectionContent(section);
}

async function loadSectionContent(section) {
    const contentArea = document.getElementById('content-area');
    
    switch (section) {
        case 'dashboard':
            await loadDashboard(contentArea);
            break;
        case 'categories':
            await loadCategories(contentArea);
            break;
        case 'entries':
            await loadEntries(contentArea);
            break;
        case 'recurring':
            await loadRecurringEntries(contentArea);
            break;
        case 'reports':
            await loadReports(contentArea);
            break;
        case 'events':
            await loadEvents(contentArea);
            break;
        case 'recurring-events':
            await loadRecurringEvents(contentArea);
            break;
        case 'companies':
            await loadCompanies(contentArea);
            break;
        case 'churches':
            await loadChurches(contentArea);
            break;
        case 'users':
            await loadUsers(contentArea);
            break;
        case 'ministries':
            await loadMinistries(contentArea);
            break;
        default:
            contentArea.innerHTML = `
                <div class="welcome-card">
                    <h2>Em desenvolvimento</h2>
                    <p>Esta seção será implementada em breve</p>
                </div>
            `;
    }
}

// ==========================================
// Dashboard
// ==========================================
async function loadDashboard(container) {
    container.innerHTML = `
        <div class="dashboard-loading">
            <div class="spinner"></div>
            <p>Carregando dashboard...</p>
        </div>
    `;
    
    try {
        if (!state.church?.id) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-church"></i>
                    <h3>Nenhuma igreja selecionada</h3>
                    <p>Selecione uma igreja para visualizar o dashboard</p>
                </div>
            `;
            return;
        }
        
        const churchId = state.church.id;
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        
        console.log('Dashboard - Church ID:', churchId);
        console.log('Dashboard - State:', state);
        
        // Buscar dados do dashboard
        const [summary, dashboard, comparison, entriesFiltered, entriesAll] = await Promise.all([
            apiRequest('GET', `/reports/church/summary?churchId=${churchId}`).catch(e => { console.log('Summary error:', e); return null; }),
            apiRequest('GET', `/reports/church/dashboard?churchId=${churchId}`).catch(e => { console.log('Dashboard error:', e); return null; }),
            apiRequest('GET', `/reports/church/comparison?churchId=${churchId}&month=${currentMonth}&year=${currentYear}`).catch(e => { console.log('Comparison error:', e); return null; }),
            apiRequest('GET', `/financial-entries?churchId=${churchId}`).catch(e => { console.log('Entries filtered error:', e); return []; }),
            apiRequest('GET', `/financial-entries`).catch(e => { console.log('Entries all error:', e); return []; })
        ]);
        
        // Usar lançamentos filtrados ou todos
        const entries = (entriesFiltered && entriesFiltered.length > 0) ? entriesFiltered : entriesAll;
        
        console.log('Dashboard - Summary:', summary);
        console.log('Dashboard - Entries filtered:', entriesFiltered?.length || 0);
        console.log('Dashboard - Entries all:', entriesAll?.length || 0);
        console.log('Dashboard - Using entries:', entries?.length || 0);
        
        // Verificar se há dados (tratando possíveis strings)
        const totalIncomeNum = parseFloat(summary?.totalIncome) || 0;
        const totalExpenseNum = parseFloat(summary?.totalExpense) || 0;
        const hasData = (totalIncomeNum > 0 || totalExpenseNum > 0) || 
                        (Array.isArray(entries) && entries.length > 0);
        
        console.log('Dashboard - totalIncome:', totalIncomeNum, 'totalExpense:', totalExpenseNum);
        console.log('Dashboard - Has data:', hasData);
        
        if (!hasData) {
            container.innerHTML = renderEmptyDashboard();
            return;
        }
        
        container.innerHTML = renderDashboard(summary, dashboard, comparison, entries);
        
        // Renderizar gráfico após inserir o HTML
        if (dashboard?.monthlyEvolution && dashboard.monthlyEvolution.length > 0) {
            renderChart(dashboard.monthlyEvolution);
        } else if (entries && entries.length > 0) {
            // Criar dados de evolução a partir dos lançamentos
            const monthlyData = createMonthlyDataFromEntries(entries);
            renderChart(monthlyData);
        }
        
    } catch (error) {
        console.error('Dashboard error:', error);
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Erro ao carregar dashboard</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadSectionContent('dashboard')">
                    <i class="fas fa-refresh"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

function renderEmptyDashboard() {
    return `
        <div class="empty-dashboard">
            <div class="empty-dashboard-content">
                <div class="empty-icon">
                    <i class="fas fa-chart-pie"></i>
                </div>
                <h2>Bem-vindo ao Dashboard!</h2>
                <p>Você ainda não possui lançamentos financeiros cadastrados.</p>
                <p class="hint">Comece cadastrando categorias e lançamentos para visualizar seus relatórios.</p>
                
                <div class="quick-actions">
                    <button class="btn btn-primary" onclick="navigateTo('categories')">
                        <i class="fas fa-tags"></i>
                        Criar Categorias
                    </button>
                    <button class="btn btn-secondary" onclick="navigateTo('entries')">
                        <i class="fas fa-plus"></i>
                        Novo Lançamento
                    </button>
                </div>
            </div>
            
            <div class="quick-stats">
                <div class="quick-stat-card">
                    <i class="fas fa-church"></i>
                    <span>Igreja: ${state.church?.name || 'N/A'}</span>
                </div>
                <div class="quick-stat-card">
                    <i class="fas fa-building"></i>
                    <span>Empresa: ${state.company?.name || 'N/A'}</span>
                </div>
                <div class="quick-stat-card">
                    <i class="fas fa-user"></i>
                    <span>Usuário: ${state.user?.name || 'N/A'}</span>
                </div>
            </div>
        </div>
    `;
}

function createMonthlyDataFromEntries(entries) {
    const monthlyMap = new Map();
    
    entries.forEach(entry => {
        const date = new Date(entry.date);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        
        if (!monthlyMap.has(key)) {
            monthlyMap.set(key, {
                month: date.getMonth() + 1,
                year: date.getFullYear(),
                income: 0,
                expense: 0
            });
        }
        
        const data = monthlyMap.get(key);
        const amount = parseFloat(entry.amount) || 0;
        
        if (entry.type === 'INCOME') {
            data.income += amount;
        } else {
            data.expense += amount;
        }
    });
    
    return Array.from(monthlyMap.values())
        .sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
        });
}

function calculateCategoriesFromEntries(entries, type) {
    const categoryMap = new Map();
    
    entries
        .filter(entry => entry.type === type)
        .forEach(entry => {
            const categoryId = entry.categoryId || entry.category?.id || 'unknown';
            const categoryName = entry.category?.name || 'Sem categoria';
            const amount = parseFloat(entry.amount) || 0;
            
            if (!categoryMap.has(categoryId)) {
                categoryMap.set(categoryId, {
                    categoryId,
                    categoryName,
                    name: categoryName,
                    total: 0
                });
            }
            
            categoryMap.get(categoryId).total += amount;
        });
    
    return Array.from(categoryMap.values())
        .sort((a, b) => b.total - a.total);
}

function navigateTo(section) {
    const navItem = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (navItem) {
        navItem.click();
    }
}

function renderDashboard(summary, dashboard, comparison, entries = []) {
    // Calcular totais do summary ou dos entries
    let totalIncome = parseFloat(summary?.totalIncome) || 0;
    let totalExpense = parseFloat(summary?.totalExpense) || 0;
    let balance = parseFloat(summary?.balance) || 0;
    
    // Se os valores do summary estiverem zerados mas tiver entries, calcular dos entries
    if ((totalIncome === 0 && totalExpense === 0) && entries.length > 0) {
        totalIncome = 0;
        totalExpense = 0;
        entries.forEach(entry => {
            const amount = parseFloat(entry.amount) || 0;
            if (entry.type === 'INCOME') {
                totalIncome += amount;
            } else {
                totalExpense += amount;
            }
        });
        balance = totalIncome - totalExpense;
    }
    
    // Calcular categorias dos entries se não tiver no summary
    const incomeByCategory = summary?.incomeByCategory?.length > 0 
        ? summary.incomeByCategory 
        : calculateCategoriesFromEntries(entries, 'INCOME');
    
    const expenseByCategory = summary?.expenseByCategory?.length > 0 
        ? summary.expenseByCategory 
        : calculateCategoriesFromEntries(entries, 'EXPENSE');
    
    // Calcular variações
    const incomeVariation = comparison?.variation?.incomeChangePercent || 0;
    const expenseVariation = comparison?.variation?.expenseChangePercent || 0;
    const balanceVariation = comparison?.variation?.balanceChangePercent || 0;
    
    return `
        <!-- Cards de Resumo -->
        <div class="stats-grid">
            <div class="stat-card income">
                <div class="stat-icon">
                    <i class="fas fa-arrow-up"></i>
                </div>
                <div class="stat-content">
                    <span class="stat-label">Receitas</span>
                    <span class="stat-value">${formatCurrency(totalIncome)}</span>
                    <span class="stat-variation ${incomeVariation >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-${incomeVariation >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${Math.abs(incomeVariation).toFixed(1)}% vs mês anterior
                    </span>
                </div>
            </div>
            
            <div class="stat-card expense">
                <div class="stat-icon">
                    <i class="fas fa-arrow-down"></i>
                </div>
                <div class="stat-content">
                    <span class="stat-label">Despesas</span>
                    <span class="stat-value">${formatCurrency(totalExpense)}</span>
                    <span class="stat-variation ${expenseVariation <= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-${expenseVariation <= 0 ? 'arrow-down' : 'arrow-up'}"></i>
                        ${Math.abs(expenseVariation).toFixed(1)}% vs mês anterior
                    </span>
                </div>
            </div>
            
            <div class="stat-card balance ${balance >= 0 ? 'positive' : 'negative'}">
                <div class="stat-icon">
                    <i class="fas fa-wallet"></i>
                </div>
                <div class="stat-content">
                    <span class="stat-label">Saldo</span>
                    <span class="stat-value">${formatCurrency(balance)}</span>
                    <span class="stat-variation ${balanceVariation >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-${balanceVariation >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${Math.abs(balanceVariation).toFixed(1)}% vs mês anterior
                    </span>
                </div>
            </div>
            
            <div class="stat-card info">
                <div class="stat-icon">
                    <i class="fas fa-percentage"></i>
                </div>
                <div class="stat-content">
                    <span class="stat-label">Margem de Lucro</span>
                    <span class="stat-value">${(dashboard?.summary?.profitMargin || 0).toFixed(1)}%</span>
                    <span class="stat-variation neutral">
                        <i class="fas fa-chart-line"></i>
                        Lucro sobre receitas
                    </span>
                </div>
            </div>
        </div>
        
        <!-- Grid Principal -->
        <div class="dashboard-grid">
            <!-- Gráfico de Evolução -->
            <div class="card chart-card">
                <div class="card-header">
                    <h3><i class="fas fa-chart-area"></i> Evolução Mensal</h3>
                </div>
                <div class="card-body">
                    <div id="chart-container" class="chart-container">
                        <canvas id="evolution-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Alertas e Mensagens -->
            <div class="card alerts-card">
                <div class="card-header">
                    <h3><i class="fas fa-bell"></i> Alertas</h3>
                </div>
                <div class="card-body">
                    ${renderAlerts(comparison?.messages || [], dashboard?.alerts || [])}
                </div>
            </div>
        </div>
        
        <!-- Segunda Linha -->
        <div class="dashboard-grid two-cols">
            <!-- Top Categorias de Receita -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-arrow-trend-up"></i> Principais Receitas</h3>
                </div>
                <div class="card-body">
                    ${renderTopCategories(dashboard?.topIncomeCategories || incomeByCategory, 'income')}
                </div>
            </div>
            
            <!-- Top Categorias de Despesa -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-arrow-trend-down"></i> Principais Despesas</h3>
                </div>
                <div class="card-body">
                    ${renderTopCategories(dashboard?.topExpenseCategories || expenseByCategory, 'expense')}
                </div>
            </div>
        </div>
    `;
}

function renderAlerts(messages, alerts) {
    const allAlerts = [
        ...messages.map(m => ({
            type: m.type.toLowerCase(),
            icon: m.icon || getAlertIcon(m.type),
            title: m.title,
            message: m.message
        })),
        ...alerts.map(a => ({
            type: a.type.toLowerCase(),
            icon: getAlertIcon(a.type),
            title: '',
            message: a.message
        }))
    ];
    
    if (allAlerts.length === 0) {
        return `
            <div class="empty-alerts">
                <i class="fas fa-check-circle"></i>
                <p>Nenhum alerta no momento</p>
            </div>
        `;
    }
    
    return `
        <div class="alerts-list">
            ${allAlerts.slice(0, 5).map(alert => `
                <div class="alert-item ${alert.type}">
                    <div class="alert-icon">
                        <i class="fas ${alert.icon}"></i>
                    </div>
                    <div class="alert-content">
                        ${alert.title ? `<strong>${alert.title}</strong>` : ''}
                        <p>${alert.message}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function getAlertIcon(type) {
    const icons = {
        SUCCESS: 'fa-check-circle',
        WARNING: 'fa-exclamation-triangle',
        DANGER: 'fa-times-circle',
        INFO: 'fa-info-circle'
    };
    return icons[type] || icons[type?.toUpperCase()] || 'fa-info-circle';
}

function renderTopCategories(categories, type) {
    if (!categories || categories.length === 0) {
        return `
            <div class="empty-categories">
                <i class="fas fa-folder-open"></i>
                <p>Nenhuma categoria registrada</p>
            </div>
        `;
    }
    
    const maxValue = Math.max(...categories.map(c => c.total || c.amount || 0));
    
    return `
        <div class="categories-list">
            ${categories.slice(0, 5).map(cat => {
                const value = cat.total || cat.amount || 0;
                const percent = maxValue > 0 ? (value / maxValue) * 100 : 0;
                const name = cat.categoryName || cat.name || 'Sem categoria';
                
                return `
                    <div class="category-item">
                        <div class="category-info">
                            <span class="category-name">${name}</span>
                            <span class="category-value">${formatCurrency(value)}</span>
                        </div>
                        <div class="category-bar">
                            <div class="category-bar-fill ${type}" style="width: ${percent}%"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderChart(monthlyData) {
    const canvas = document.getElementById('evolution-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    
    // Ajustar tamanho do canvas
    canvas.width = container.offsetWidth;
    canvas.height = 280;
    
    if (!monthlyData || monthlyData.length === 0) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Sem dados para exibir', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const padding = { top: 20, right: 20, bottom: 40, left: 70 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    // Encontrar valores máximos
    const allValues = monthlyData.flatMap(d => [d.income, d.expense, Math.abs(d.balance || d.cumulativeBalance || 0)]);
    const maxValue = Math.max(...allValues, 1);
    
    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
        ctx.stroke();
        
        // Labels do eixo Y
        const value = maxValue - (maxValue / 4) * i;
        ctx.fillStyle = '#9ca3af';
        ctx.font = '11px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(formatCurrencyShort(value), padding.left - 10, y + 4);
    }
    
    // Calcular posições X
    const barWidth = chartWidth / monthlyData.length;
    const barPadding = barWidth * 0.2;
    const singleBarWidth = (barWidth - barPadding * 2) / 2;
    
    // Desenhar barras
    monthlyData.forEach((data, index) => {
        const x = padding.left + index * barWidth;
        
        // Barra de receita
        const incomeHeight = (data.income / maxValue) * chartHeight;
        ctx.fillStyle = '#10b981';
        ctx.fillRect(
            x + barPadding,
            padding.top + chartHeight - incomeHeight,
            singleBarWidth,
            incomeHeight
        );
        
        // Barra de despesa
        const expenseHeight = (data.expense / maxValue) * chartHeight;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(
            x + barPadding + singleBarWidth,
            padding.top + chartHeight - expenseHeight,
            singleBarWidth,
            expenseHeight
        );
        
        // Label do mês
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        ctx.fillStyle = '#6b7280';
        ctx.font = '11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(monthNames[data.month - 1] || data.month, x + barWidth / 2, canvas.height - 10);
    });
    
    // Legenda
    const legendY = padding.top - 5;
    ctx.font = '12px Inter';
    
    ctx.fillStyle = '#10b981';
    ctx.fillRect(canvas.width - 150, legendY - 8, 12, 12);
    ctx.fillStyle = '#374151';
    ctx.textAlign = 'left';
    ctx.fillText('Receitas', canvas.width - 135, legendY);
    
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(canvas.width - 70, legendY - 8, 12, 12);
    ctx.fillStyle = '#374151';
    ctx.fillText('Despesas', canvas.width - 55, legendY);
}

// ==========================================
// Categorias Financeiras
// ==========================================
let categoriesData = [];
let editingCategoryId = null;

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

function closeCategoryModal() {
    const modal = document.getElementById('category-modal');
    modal.classList.add('hidden');
    editingCategoryId = null;
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('category-name').value;
    const type = document.getElementById('category-type').value;
    const parentId = document.getElementById('category-parent').value || null;
    
    const data = {
        churchId: state.church?.id,
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

function editCategory(categoryId) {
    openCategoryModal(categoryId);
}

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

// ==========================================
// Lançamentos Financeiros
// ==========================================
let entriesData = [];
let ministriesData = [];
let editingEntryId = null;

async function loadEntries(container) {
    container.innerHTML = `
        <div class="dashboard-loading">
            <div class="spinner"></div>
            <p>Carregando lançamentos...</p>
        </div>
    `;
    
    try {
        const churchId = state.church?.id;
        
        // Buscar dados em paralelo
        const [entries, categories, ministries] = await Promise.all([
            apiRequest('GET', `/financial-entries${churchId ? `?churchId=${churchId}` : ''}`),
            apiRequest('GET', '/financial-categories').catch(() => []),
            apiRequest('GET', '/ministries').catch(() => [])
        ]);
        
        entriesData = entries || [];
        categoriesData = categories || [];
        ministriesData = ministries || [];
        
        container.innerHTML = renderEntriesPage(entriesData);
        setupEntryEventListeners();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Erro ao carregar lançamentos</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadSectionContent('entries')">
                    <i class="fas fa-refresh"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

function renderEntriesPage(entries) {
    // Calcular totais
    const totalIncome = entries.filter(e => e.type === 'INCOME').reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalExpense = entries.filter(e => e.type === 'EXPENSE').reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const balance = totalIncome - totalExpense;
    
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Lançamentos Financeiros</h2>
                <p>Gerencie as entradas e saídas</p>
            </div>
            <button class="btn btn-primary" onclick="openEntryModal()">
                <i class="fas fa-plus"></i>
                Novo Lançamento
            </button>
        </div>
        
        <!-- Cards de Resumo -->
        <div class="entries-summary">
            <div class="summary-card income">
                <i class="fas fa-arrow-up"></i>
                <div>
                    <span class="label">Total Receitas</span>
                    <span class="value">${formatCurrency(totalIncome)}</span>
                </div>
            </div>
            <div class="summary-card expense">
                <i class="fas fa-arrow-down"></i>
                <div>
                    <span class="label">Total Despesas</span>
                    <span class="value">${formatCurrency(totalExpense)}</span>
                </div>
            </div>
            <div class="summary-card ${balance >= 0 ? 'positive' : 'negative'}">
                <i class="fas fa-wallet"></i>
                <div>
                    <span class="label">Saldo</span>
                    <span class="value">${formatCurrency(balance)}</span>
                </div>
            </div>
        </div>
        
        <!-- Filtros -->
        <div class="filters-bar">
            <div class="filter-group">
                <select id="filter-type" onchange="filterEntries()">
                    <option value="">Todos os tipos</option>
                    <option value="INCOME">Receitas</option>
                    <option value="EXPENSE">Despesas</option>
                </select>
                <select id="filter-category" onchange="filterEntries()">
                    <option value="">Todas as categorias</option>
                    ${categoriesData.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="entries-count">
                <span id="entries-count-text">${entries.length} lançamentos</span>
            </div>
        </div>
        
        <!-- Tabela de Lançamentos -->
        <div class="card">
            <div class="table-container">
                ${renderEntriesTable(entries)}
            </div>
        </div>
        
        <!-- Modal de Lançamento -->
        ${renderEntryModal()}
    `;
}

function renderEntriesTable(entries) {
    if (entries.length === 0) {
        return `
            <div class="empty-list" style="padding: 60px 20px;">
                <i class="fas fa-receipt"></i>
                <p>Nenhum lançamento encontrado</p>
            </div>
        `;
    }
    
    // Ordenar por data (mais recentes primeiro)
    const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return `
        <table class="data-table" id="entries-table">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>Tipo</th>
                    <th class="text-right">Valor</th>
                    <th class="text-center">Ações</th>
                </tr>
            </thead>
            <tbody>
                ${sortedEntries.map(entry => `
                    <tr data-id="${entry.id}" data-type="${entry.type}" data-category="${entry.categoryId}">
                        <td>
                            <span class="date-cell">${formatDate(entry.date)}</span>
                        </td>
                        <td>
                            <div class="description-cell">
                                <span class="description-text">${entry.description || 'Sem descrição'}</span>
                                ${entry.ministry ? `<span class="ministry-badge">${entry.ministry.name}</span>` : ''}
                            </div>
                        </td>
                        <td>
                            <span class="category-badge ${entry.type.toLowerCase()}">
                                ${entry.category?.name || 'Sem categoria'}
                            </span>
                        </td>
                        <td>
                            <span class="type-indicator ${entry.type.toLowerCase()}">
                                <i class="fas fa-${entry.type === 'INCOME' ? 'arrow-up' : 'arrow-down'}"></i>
                                ${entry.type === 'INCOME' ? 'Receita' : 'Despesa'}
                            </span>
                        </td>
                        <td class="text-right">
                            <span class="amount ${entry.type.toLowerCase()}">${formatCurrency(entry.amount)}</span>
                        </td>
                        <td class="text-center">
                            <div class="table-actions">
                                <button class="btn-icon" onclick="editEntry('${entry.id}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon danger" onclick="deleteEntry('${entry.id}')" title="Excluir">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderEntryModal() {
    return `
        <div id="entry-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeEntryModal()"></div>
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3 id="entry-modal-title">Novo Lançamento</h3>
                    <button class="modal-close" onclick="closeEntryModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="entry-form" class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="entry-type">Tipo *</label>
                            <select id="entry-type" required onchange="updateEntryCategoryOptions()">
                                <option value="">Selecione o tipo</option>
                                <option value="INCOME">Receita</option>
                                <option value="EXPENSE">Despesa</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="entry-category">Categoria *</label>
                            <select id="entry-category" required>
                                <option value="">Selecione o tipo primeiro</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="entry-amount">Valor *</label>
                            <input type="number" id="entry-amount" step="0.01" min="0.01" placeholder="0,00" required>
                        </div>
                        <div class="form-group">
                            <label for="entry-date">Data *</label>
                            <input type="date" id="entry-date" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="entry-description">Descrição</label>
                        <textarea id="entry-description" rows="2" placeholder="Descrição do lançamento..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="entry-ministry">Ministério (opcional)</label>
                        <select id="entry-ministry">
                            <option value="">Nenhum</option>
                            ${ministriesData.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeEntryModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function setupEntryEventListeners() {
    const form = document.getElementById('entry-form');
    if (form) {
        form.addEventListener('submit', handleEntrySubmit);
    }
}

function updateEntryCategoryOptions() {
    const type = document.getElementById('entry-type').value;
    const categorySelect = document.getElementById('entry-category');
    
    if (!type) {
        categorySelect.innerHTML = '<option value="">Selecione o tipo primeiro</option>';
        return;
    }
    
    const filteredCategories = categoriesData.filter(c => c.type === type);
    
    categorySelect.innerHTML = `
        <option value="">Selecione a categoria</option>
        ${filteredCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
    `;
}

function openEntryModal(entryId = null) {
    editingEntryId = entryId;
    const modal = document.getElementById('entry-modal');
    const title = document.getElementById('entry-modal-title');
    const form = document.getElementById('entry-form');
    
    form.reset();
    
    // Data padrão: hoje
    document.getElementById('entry-date').value = new Date().toISOString().split('T')[0];
    
    if (entryId) {
        title.textContent = 'Editar Lançamento';
        const entry = entriesData.find(e => e.id === entryId);
        if (entry) {
            document.getElementById('entry-type').value = entry.type;
            updateEntryCategoryOptions();
            document.getElementById('entry-category').value = entry.categoryId;
            document.getElementById('entry-amount').value = parseFloat(entry.amount);
            document.getElementById('entry-date').value = entry.date.split('T')[0];
            document.getElementById('entry-description').value = entry.description || '';
            document.getElementById('entry-ministry').value = entry.ministryId || '';
        }
    } else {
        title.textContent = 'Novo Lançamento';
        document.getElementById('entry-category').innerHTML = '<option value="">Selecione o tipo primeiro</option>';
    }
    
    modal.classList.remove('hidden');
}

function closeEntryModal() {
    const modal = document.getElementById('entry-modal');
    modal.classList.add('hidden');
    editingEntryId = null;
}

async function handleEntrySubmit(e) {
    e.preventDefault();
    
    const type = document.getElementById('entry-type').value;
    const categoryId = document.getElementById('entry-category').value;
    const amount = parseFloat(document.getElementById('entry-amount').value);
    const date = document.getElementById('entry-date').value;
    const description = document.getElementById('entry-description').value;
    const ministryId = document.getElementById('entry-ministry').value || null;
    
    const data = {
        churchId: state.church?.id,
        categoryId,
        userId: state.user?.id,
        type,
        amount,
        date,
        description,
        ministryId
    };
    
    showLoading();
    
    try {
        if (editingEntryId) {
            await apiRequest('PUT', `/financial-entries/${editingEntryId}`, {
                categoryId,
                amount,
                date,
                description,
                ministryId
            });
            showToast('success', 'Lançamento atualizado!', 'O lançamento foi atualizado com sucesso.');
        } else {
            await apiRequest('POST', '/financial-entries', data);
            showToast('success', 'Lançamento criado!', 'O novo lançamento foi registrado com sucesso.');
        }
        
        closeEntryModal();
        await loadSectionContent('entries');
        
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível salvar o lançamento.');
    } finally {
        hideLoading();
    }
}

function editEntry(entryId) {
    openEntryModal(entryId);
}

async function deleteEntry(entryId) {
    const entry = entriesData.find(e => e.id === entryId);
    if (!confirm(`Deseja realmente excluir este lançamento de ${formatCurrency(entry?.amount)}?`)) {
        return;
    }
    
    showLoading();
    
    try {
        await apiRequest('DELETE', `/financial-entries/${entryId}`);
        showToast('success', 'Lançamento excluído!', 'O lançamento foi removido com sucesso.');
        await loadSectionContent('entries');
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível excluir o lançamento.');
    } finally {
        hideLoading();
    }
}

function filterEntries() {
    const typeFilter = document.getElementById('filter-type').value;
    const categoryFilter = document.getElementById('filter-category').value;
    
    const rows = document.querySelectorAll('#entries-table tbody tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const type = row.dataset.type;
        const category = row.dataset.category;
        
        const typeMatch = !typeFilter || type === typeFilter;
        const categoryMatch = !categoryFilter || category === categoryFilter;
        
        if (typeMatch && categoryMatch) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    document.getElementById('entries-count-text').textContent = `${visibleCount} lançamentos`;
}

// ==========================================
// Lançamentos Recorrentes
// ==========================================
let recurringEntriesData = [];
let editingRecurringId = null;

async function loadRecurringEntries(container) {
    container.innerHTML = `
        <div class="dashboard-loading">
            <div class="spinner"></div>
            <p>Carregando lançamentos recorrentes...</p>
        </div>
    `;
    
    try {
        const [recurring, categories, ministries] = await Promise.all([
            apiRequest('GET', '/financial-recurring-entries'),
            apiRequest('GET', '/financial-categories').catch(() => []),
            apiRequest('GET', '/ministries').catch(() => [])
        ]);
        
        recurringEntriesData = recurring || [];
        categoriesData = categories || [];
        ministriesData = ministries || [];
        
        container.innerHTML = renderRecurringPage(recurringEntriesData);
        setupRecurringEventListeners();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Erro ao carregar lançamentos recorrentes</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadSectionContent('recurring')">
                    <i class="fas fa-refresh"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

function renderRecurringPage(entries) {
    const activeEntries = entries.filter(e => e.active !== false);
    const totalMonthlyIncome = activeEntries
        .filter(e => e.type === 'INCOME' && e.frequency === 'MONTHLY')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalMonthlyExpense = activeEntries
        .filter(e => e.type === 'EXPENSE' && e.frequency === 'MONTHLY')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Lançamentos Recorrentes</h2>
                <p>Gerencie despesas e receitas que se repetem automaticamente</p>
            </div>
            <button class="btn btn-primary" onclick="openRecurringModal()">
                <i class="fas fa-plus"></i>
                Novo Recorrente
            </button>
        </div>
        
        <!-- Cards de Resumo Mensal -->
        <div class="entries-summary">
            <div class="summary-card income">
                <i class="fas fa-arrow-up"></i>
                <div>
                    <span class="label">Receitas Mensais</span>
                    <span class="value">${formatCurrency(totalMonthlyIncome)}</span>
                </div>
            </div>
            <div class="summary-card expense">
                <i class="fas fa-arrow-down"></i>
                <div>
                    <span class="label">Despesas Mensais</span>
                    <span class="value">${formatCurrency(totalMonthlyExpense)}</span>
                </div>
            </div>
            <div class="summary-card ${totalMonthlyIncome - totalMonthlyExpense >= 0 ? 'positive' : 'negative'}">
                <i class="fas fa-calculator"></i>
                <div>
                    <span class="label">Projeção Mensal</span>
                    <span class="value">${formatCurrency(totalMonthlyIncome - totalMonthlyExpense)}</span>
                </div>
            </div>
        </div>
        
        <!-- Lista de Recorrentes -->
        <div class="recurring-grid">
            <!-- Receitas Recorrentes -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-arrow-up" style="color: var(--success)"></i> Receitas Recorrentes</h3>
                    <span class="badge badge-success">${entries.filter(e => e.type === 'INCOME').length}</span>
                </div>
                <div class="card-body">
                    ${renderRecurringList(entries.filter(e => e.type === 'INCOME'), 'INCOME')}
                </div>
            </div>
            
            <!-- Despesas Recorrentes -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-arrow-down" style="color: var(--danger)"></i> Despesas Recorrentes</h3>
                    <span class="badge badge-danger">${entries.filter(e => e.type === 'EXPENSE').length}</span>
                </div>
                <div class="card-body">
                    ${renderRecurringList(entries.filter(e => e.type === 'EXPENSE'), 'EXPENSE')}
                </div>
            </div>
        </div>
        
        <!-- Modal -->
        ${renderRecurringModal()}
    `;
}

function renderRecurringList(entries, type) {
    if (entries.length === 0) {
        return `
            <div class="empty-list">
                <i class="fas fa-repeat"></i>
                <p>Nenhum lançamento recorrente</p>
            </div>
        `;
    }
    
    return `
        <ul class="recurring-list">
            ${entries.map(entry => `
                <li class="recurring-item ${entry.active === false ? 'inactive' : ''}">
                    <div class="recurring-main">
                        <div class="recurring-icon ${type.toLowerCase()}">
                            <i class="fas fa-${type === 'INCOME' ? 'arrow-up' : 'arrow-down'}"></i>
                        </div>
                        <div class="recurring-info">
                            <span class="recurring-name">${entry.description || entry.category?.name || 'Sem descrição'}</span>
                            <div class="recurring-meta">
                                <span class="recurring-category">${entry.category?.name || 'Sem categoria'}</span>
                                <span class="recurring-frequency">
                                    <i class="fas fa-calendar"></i>
                                    ${formatFrequency(entry.frequency)} - Dia ${entry.dueDay}
                                </span>
                            </div>
                        </div>
                        <div class="recurring-amount ${type.toLowerCase()}">
                            ${formatCurrency(entry.amount)}
                        </div>
                        <div class="recurring-status">
                            <span class="status-badge ${entry.active !== false ? 'active' : 'inactive'}">
                                ${entry.active !== false ? 'Ativo' : 'Inativo'}
                            </span>
                        </div>
                        <div class="recurring-actions">
                            <button class="btn-icon" onclick="editRecurring('${entry.id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon ${entry.active !== false ? 'warning' : 'success'}" 
                                    onclick="toggleRecurring('${entry.id}', ${entry.active !== false})" 
                                    title="${entry.active !== false ? 'Desativar' : 'Ativar'}">
                                <i class="fas fa-${entry.active !== false ? 'pause' : 'play'}"></i>
                            </button>
                            <button class="btn-icon danger" onclick="deleteRecurring('${entry.id}')" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </li>
            `).join('')}
        </ul>
    `;
}

function renderRecurringModal() {
    return `
        <div id="recurring-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeRecurringModal()"></div>
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3 id="recurring-modal-title">Novo Lançamento Recorrente</h3>
                    <button class="modal-close" onclick="closeRecurringModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="recurring-form" class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="recurring-type">Tipo *</label>
                            <select id="recurring-type" required onchange="updateRecurringCategoryOptions()">
                                <option value="">Selecione o tipo</option>
                                <option value="INCOME">Receita</option>
                                <option value="EXPENSE">Despesa</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="recurring-category">Categoria *</label>
                            <select id="recurring-category" required>
                                <option value="">Selecione o tipo primeiro</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="recurring-amount">Valor *</label>
                            <input type="number" id="recurring-amount" step="0.01" min="0.01" placeholder="0,00" required>
                        </div>
                        <div class="form-group">
                            <label for="recurring-frequency">Frequência *</label>
                            <select id="recurring-frequency" required>
                                <option value="">Selecione</option>
                                <option value="DAILY">Diário</option>
                                <option value="WEEKLY">Semanal</option>
                                <option value="MONTHLY">Mensal</option>
                                <option value="YEARLY">Anual</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="recurring-due-day">Dia do Vencimento *</label>
                            <input type="number" id="recurring-due-day" min="1" max="31" placeholder="1-31" required>
                        </div>
                        <div class="form-group">
                            <label for="recurring-ministry">Ministério (opcional)</label>
                            <select id="recurring-ministry">
                                <option value="">Nenhum</option>
                                ${ministriesData.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="recurring-description">Descrição</label>
                        <input type="text" id="recurring-description" placeholder="Ex: Aluguel, Conta de luz...">
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="recurring-active" checked>
                            <span>Lançamento ativo</span>
                        </label>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeRecurringModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function setupRecurringEventListeners() {
    const form = document.getElementById('recurring-form');
    if (form) {
        form.addEventListener('submit', handleRecurringSubmit);
    }
}

function updateRecurringCategoryOptions() {
    const type = document.getElementById('recurring-type').value;
    const categorySelect = document.getElementById('recurring-category');
    
    if (!type) {
        categorySelect.innerHTML = '<option value="">Selecione o tipo primeiro</option>';
        return;
    }
    
    const filteredCategories = categoriesData.filter(c => c.type === type);
    
    categorySelect.innerHTML = `
        <option value="">Selecione a categoria</option>
        ${filteredCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
    `;
}

function openRecurringModal(entryId = null) {
    editingRecurringId = entryId;
    const modal = document.getElementById('recurring-modal');
    const title = document.getElementById('recurring-modal-title');
    const form = document.getElementById('recurring-form');
    
    form.reset();
    document.getElementById('recurring-active').checked = true;
    
    if (entryId) {
        title.textContent = 'Editar Lançamento Recorrente';
        const entry = recurringEntriesData.find(e => e.id === entryId);
        if (entry) {
            document.getElementById('recurring-type').value = entry.type;
            updateRecurringCategoryOptions();
            document.getElementById('recurring-category').value = entry.categoryId;
            document.getElementById('recurring-amount').value = parseFloat(entry.amount);
            document.getElementById('recurring-frequency').value = entry.frequency;
            document.getElementById('recurring-due-day').value = entry.dueDay;
            document.getElementById('recurring-description').value = entry.description || '';
            document.getElementById('recurring-ministry').value = entry.ministryId || '';
            document.getElementById('recurring-active').checked = entry.active !== false;
        }
    } else {
        title.textContent = 'Novo Lançamento Recorrente';
        document.getElementById('recurring-category').innerHTML = '<option value="">Selecione o tipo primeiro</option>';
    }
    
    modal.classList.remove('hidden');
}

function closeRecurringModal() {
    const modal = document.getElementById('recurring-modal');
    modal.classList.add('hidden');
    editingRecurringId = null;
}

async function handleRecurringSubmit(e) {
    e.preventDefault();
    
    const type = document.getElementById('recurring-type').value;
    const categoryId = document.getElementById('recurring-category').value;
    const amount = parseFloat(document.getElementById('recurring-amount').value);
    const frequency = document.getElementById('recurring-frequency').value;
    const dueDay = parseInt(document.getElementById('recurring-due-day').value);
    const description = document.getElementById('recurring-description').value;
    const ministryId = document.getElementById('recurring-ministry').value || null;
    const active = document.getElementById('recurring-active').checked;
    
    const data = {
        churchId: state.church?.id,
        categoryId,
        userId: state.user?.id,
        type,
        amount,
        frequency,
        dueDay,
        description,
        ministryId,
        active
    };
    
    showLoading();
    
    try {
        if (editingRecurringId) {
            await apiRequest('PUT', `/financial-recurring-entries/${editingRecurringId}`, {
                categoryId,
                amount,
                frequency,
                dueDay,
                description,
                ministryId,
                active
            });
            showToast('success', 'Recorrente atualizado!', 'O lançamento recorrente foi atualizado.');
        } else {
            await apiRequest('POST', '/financial-recurring-entries', data);
            showToast('success', 'Recorrente criado!', 'O novo lançamento recorrente foi criado.');
        }
        
        closeRecurringModal();
        await loadSectionContent('recurring');
        
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível salvar.');
    } finally {
        hideLoading();
    }
}

function editRecurring(entryId) {
    openRecurringModal(entryId);
}

async function toggleRecurring(entryId, isActive) {
    showLoading();
    
    try {
        await apiRequest('PUT', `/financial-recurring-entries/${entryId}`, {
            active: !isActive
        });
        showToast('success', isActive ? 'Desativado!' : 'Ativado!', 
            `O lançamento foi ${isActive ? 'desativado' : 'ativado'}.`);
        await loadSectionContent('recurring');
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível alterar o status.');
    } finally {
        hideLoading();
    }
}

async function deleteRecurring(entryId) {
    if (!confirm('Deseja realmente excluir este lançamento recorrente?')) {
        return;
    }
    
    showLoading();
    
    try {
        await apiRequest('DELETE', `/financial-recurring-entries/${entryId}`);
        showToast('success', 'Excluído!', 'O lançamento recorrente foi removido.');
        await loadSectionContent('recurring');
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível excluir.');
    } finally {
        hideLoading();
    }
}

function formatFrequency(frequency) {
    const frequencies = {
        DAILY: 'Diário',
        WEEKLY: 'Semanal',
        MONTHLY: 'Mensal',
        YEARLY: 'Anual'
    };
    return frequencies[frequency] || frequency;
}

// ==========================================
// Relatórios
// ==========================================
let currentReportTab = 'comparison';

async function loadReports(container) {
    container.innerHTML = `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Relatórios Financeiros</h2>
                <p>Análises e insights sobre suas finanças</p>
            </div>
        </div>
        
        <!-- Tabs de Relatórios -->
        <div class="report-tabs">
            <button class="report-tab active" data-tab="comparison" onclick="switchReportTab('comparison')">
                <i class="fas fa-chart-bar"></i>
                Comparativo
            </button>
            <button class="report-tab" data-tab="ministries" onclick="switchReportTab('ministries')">
                <i class="fas fa-hands-praying"></i>
                Por Ministério
            </button>
            <button class="report-tab" data-tab="projection" onclick="switchReportTab('projection')">
                <i class="fas fa-chart-line"></i>
                Projeção
            </button>
            <button class="report-tab" data-tab="summary" onclick="switchReportTab('summary')">
                <i class="fas fa-file-invoice-dollar"></i>
                Resumo Geral
            </button>
        </div>
        
        <!-- Conteúdo do Relatório -->
        <div id="report-content" class="report-content">
            <div class="dashboard-loading">
                <div class="spinner"></div>
                <p>Carregando relatório...</p>
            </div>
        </div>
    `;
    
    await loadReportTab('comparison');
}

async function switchReportTab(tab) {
    currentReportTab = tab;
    
    // Atualizar tabs ativas
    document.querySelectorAll('.report-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    
    await loadReportTab(tab);
}

async function loadReportTab(tab) {
    const container = document.getElementById('report-content');
    container.innerHTML = `
        <div class="dashboard-loading">
            <div class="spinner"></div>
            <p>Carregando relatório...</p>
        </div>
    `;
    
    const churchId = state.church?.id;
    if (!churchId) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-church"></i>
                <h3>Selecione uma igreja</h3>
                <p>Escolha uma igreja para visualizar os relatórios</p>
            </div>
        `;
        return;
    }
    
    try {
        switch (tab) {
            case 'comparison':
                await loadComparisonReport(container, churchId);
                break;
            case 'ministries':
                await loadMinistriesReport(container, churchId);
                break;
            case 'projection':
                await loadProjectionReport(container, churchId);
                break;
            case 'summary':
                await loadSummaryReport(container, churchId);
                break;
        }
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Erro ao carregar relatório</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadReportTab('${tab}')">
                    <i class="fas fa-refresh"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

// Relatório Comparativo
async function loadComparisonReport(container, churchId) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    const data = await apiRequest('GET', `/reports/church/comparison?churchId=${churchId}&month=${month}&year=${year}`);
    
    const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    container.innerHTML = `
        <div class="report-header">
            <h3><i class="fas fa-chart-bar"></i> Comparativo Mensal</h3>
            <p>${monthNames[data.currentMonth.month]} ${data.currentMonth.year} vs ${monthNames[data.previousMonth.month]} ${data.previousMonth.year}</p>
        </div>
        
        <!-- Cards Comparativos -->
        <div class="comparison-grid">
            <div class="comparison-card">
                <div class="comparison-label">Receitas</div>
                <div class="comparison-values">
                    <div class="comparison-current">
                        <span class="value">${formatCurrency(data.currentMonth.income)}</span>
                        <span class="label">Atual</span>
                    </div>
                    <div class="comparison-arrow ${data.trend.incomeTrend.toLowerCase()}">
                        <i class="fas fa-arrow-${data.trend.incomeTrend === 'UP' ? 'up' : data.trend.incomeTrend === 'DOWN' ? 'down' : 'right'}"></i>
                        <span>${Math.abs(data.variation.incomeChangePercent).toFixed(1)}%</span>
                    </div>
                    <div class="comparison-previous">
                        <span class="value">${formatCurrency(data.previousMonth.income)}</span>
                        <span class="label">Anterior</span>
                    </div>
                </div>
            </div>
            
            <div class="comparison-card">
                <div class="comparison-label">Despesas</div>
                <div class="comparison-values">
                    <div class="comparison-current">
                        <span class="value">${formatCurrency(data.currentMonth.expense)}</span>
                        <span class="label">Atual</span>
                    </div>
                    <div class="comparison-arrow ${data.trend.expenseTrend === 'DOWN' ? 'up' : data.trend.expenseTrend === 'UP' ? 'down' : 'stable'}">
                        <i class="fas fa-arrow-${data.trend.expenseTrend === 'UP' ? 'up' : data.trend.expenseTrend === 'DOWN' ? 'down' : 'right'}"></i>
                        <span>${Math.abs(data.variation.expenseChangePercent).toFixed(1)}%</span>
                    </div>
                    <div class="comparison-previous">
                        <span class="value">${formatCurrency(data.previousMonth.expense)}</span>
                        <span class="label">Anterior</span>
                    </div>
                </div>
            </div>
            
            <div class="comparison-card">
                <div class="comparison-label">Saldo</div>
                <div class="comparison-values">
                    <div class="comparison-current">
                        <span class="value ${data.currentMonth.balance >= 0 ? 'positive' : 'negative'}">${formatCurrency(data.currentMonth.balance)}</span>
                        <span class="label">Atual</span>
                    </div>
                    <div class="comparison-arrow ${data.trend.balanceTrend.toLowerCase()}">
                        <i class="fas fa-arrow-${data.trend.balanceTrend === 'UP' ? 'up' : data.trend.balanceTrend === 'DOWN' ? 'down' : 'right'}"></i>
                        <span>${Math.abs(data.variation.balanceChangePercent).toFixed(1)}%</span>
                    </div>
                    <div class="comparison-previous">
                        <span class="value ${data.previousMonth.balance >= 0 ? 'positive' : 'negative'}">${formatCurrency(data.previousMonth.balance)}</span>
                        <span class="label">Anterior</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Mensagens/Alertas -->
        ${data.messages && data.messages.length > 0 ? `
            <div class="report-messages">
                <h4><i class="fas fa-lightbulb"></i> Insights</h4>
                <div class="messages-list">
                    ${data.messages.map(msg => `
                        <div class="message-card ${msg.type.toLowerCase()}">
                            <div class="message-icon">
                                <i class="fas ${msg.icon || getMessageIcon(msg.type)}"></i>
                            </div>
                            <div class="message-content">
                                <strong>${msg.title}</strong>
                                <p>${msg.message}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

// Relatório por Ministério
async function loadMinistriesReport(container, churchId) {
    const data = await apiRequest('GET', `/reports/church/ministries?churchId=${churchId}`);
    
    container.innerHTML = `
        <div class="report-header">
            <h3><i class="fas fa-hands-praying"></i> Relatório por Ministério</h3>
            <p>Análise financeira por área de atuação</p>
        </div>
        
        ${data.overallMessage ? `
            <div class="message-card ${data.overallMessage.type.toLowerCase()}" style="margin-bottom: 24px;">
                <div class="message-icon">
                    <i class="fas ${data.overallMessage.icon || getMessageIcon(data.overallMessage.type)}"></i>
                </div>
                <div class="message-content">
                    <strong>${data.overallMessage.title}</strong>
                    <p>${data.overallMessage.message}</p>
                </div>
            </div>
        ` : ''}
        
        ${data.ministries && data.ministries.length > 0 ? `
            <div class="ministries-report-grid">
                ${data.ministries.map(ministry => `
                    <div class="ministry-report-card">
                        <div class="ministry-header">
                            <h4>${ministry.ministryName}</h4>
                            <span class="percent-badge">${ministry.percentOfTotalExpense.toFixed(1)}% das despesas</span>
                        </div>
                        <div class="ministry-stats">
                            <div class="ministry-stat income">
                                <span class="label">Receitas</span>
                                <span class="value">${formatCurrency(ministry.totalIncome)}</span>
                            </div>
                            <div class="ministry-stat expense">
                                <span class="label">Despesas</span>
                                <span class="value">${formatCurrency(ministry.totalExpense)}</span>
                            </div>
                            <div class="ministry-stat ${ministry.balance >= 0 ? 'positive' : 'negative'}">
                                <span class="label">Saldo</span>
                                <span class="value">${formatCurrency(ministry.balance)}</span>
                            </div>
                        </div>
                        ${ministry.message ? `
                            <div class="ministry-message ${ministry.message.type.toLowerCase()}">
                                <i class="fas ${ministry.message.icon || getMessageIcon(ministry.message.type)}"></i>
                                <span>${ministry.message.message}</span>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        ` : `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>Sem dados de ministérios</h3>
                <p>Não há lançamentos vinculados a ministérios</p>
            </div>
        `}
    `;
}

// Projeção Financeira
async function loadProjectionReport(container, churchId) {
    const data = await apiRequest('GET', `/reports/church/projection?churchId=${churchId}`);
    
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    container.innerHTML = `
        <div class="report-header">
            <h3><i class="fas fa-chart-line"></i> Projeção Financeira</h3>
            <p>Baseada nos lançamentos recorrentes ativos</p>
        </div>
        
        <!-- Projeção do Mês Atual -->
        <div class="projection-current">
            <h4>Projeção para o Mês Atual</h4>
            <div class="projection-cards">
                <div class="projection-card income">
                    <i class="fas fa-arrow-up"></i>
                    <div>
                        <span class="label">Receitas Projetadas</span>
                        <span class="value">${formatCurrency(data.projectedIncome)}</span>
                    </div>
                </div>
                <div class="projection-card expense">
                    <i class="fas fa-arrow-down"></i>
                    <div>
                        <span class="label">Despesas Projetadas</span>
                        <span class="value">${formatCurrency(data.projectedExpense)}</span>
                    </div>
                </div>
                <div class="projection-card ${data.projectedBalance >= 0 ? 'positive' : 'negative'}">
                    <i class="fas fa-wallet"></i>
                    <div>
                        <span class="label">Saldo Projetado</span>
                        <span class="value">${formatCurrency(data.projectedBalance)}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Projeção dos Próximos Meses -->
        ${data.nextMonthsProjection && data.nextMonthsProjection.length > 0 ? `
            <div class="projection-future">
                <h4>Próximos 6 Meses</h4>
                <div class="projection-timeline">
                    ${data.nextMonthsProjection.map(proj => {
                        const balance = proj.projectedRecurringIncome - proj.projectedRecurringExpense;
                        return `
                            <div class="timeline-item">
                                <div class="timeline-month">${monthNames[proj.month - 1]}/${proj.year}</div>
                                <div class="timeline-bars">
                                    <div class="timeline-bar income" title="Receita: ${formatCurrency(proj.projectedRecurringIncome)}">
                                        <span>${formatCurrencyShort(proj.projectedRecurringIncome)}</span>
                                    </div>
                                    <div class="timeline-bar expense" title="Despesa: ${formatCurrency(proj.projectedRecurringExpense)}">
                                        <span>${formatCurrencyShort(proj.projectedRecurringExpense)}</span>
                                    </div>
                                </div>
                                <div class="timeline-balance ${balance >= 0 ? 'positive' : 'negative'}">
                                    ${formatCurrency(balance)}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : ''}
        
        <!-- Mensagens -->
        ${data.messages && data.messages.length > 0 ? `
            <div class="report-messages">
                <h4><i class="fas fa-lightbulb"></i> Insights da Projeção</h4>
                <div class="messages-list">
                    ${data.messages.map(msg => `
                        <div class="message-card ${msg.type.toLowerCase()}">
                            <div class="message-icon">
                                <i class="fas ${msg.icon || getMessageIcon(msg.type)}"></i>
                            </div>
                            <div class="message-content">
                                <strong>${msg.title}</strong>
                                <p>${msg.message}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

// Resumo Geral
async function loadSummaryReport(container, churchId) {
    const [summary, dashboard] = await Promise.all([
        apiRequest('GET', `/reports/church/summary?churchId=${churchId}`),
        apiRequest('GET', `/reports/church/dashboard?churchId=${churchId}`).catch(() => null)
    ]);
    
    container.innerHTML = `
        <div class="report-header">
            <h3><i class="fas fa-file-invoice-dollar"></i> Resumo Geral</h3>
            <p>Visão consolidada das finanças</p>
        </div>
        
        <!-- Totais -->
        <div class="summary-totals">
            <div class="total-card income">
                <div class="total-icon"><i class="fas fa-arrow-up"></i></div>
                <div class="total-info">
                    <span class="label">Total de Receitas</span>
                    <span class="value">${formatCurrency(summary.totalIncome)}</span>
                </div>
            </div>
            <div class="total-card expense">
                <div class="total-icon"><i class="fas fa-arrow-down"></i></div>
                <div class="total-info">
                    <span class="label">Total de Despesas</span>
                    <span class="value">${formatCurrency(summary.totalExpense)}</span>
                </div>
            </div>
            <div class="total-card ${summary.balance >= 0 ? 'positive' : 'negative'}">
                <div class="total-icon"><i class="fas fa-wallet"></i></div>
                <div class="total-info">
                    <span class="label">Saldo Total</span>
                    <span class="value">${formatCurrency(summary.balance)}</span>
                </div>
            </div>
        </div>
        
        <!-- Categorias -->
        <div class="summary-categories">
            <div class="category-section">
                <h4><i class="fas fa-arrow-trend-up"></i> Receitas por Categoria</h4>
                ${renderCategorySummary(summary.incomeByCategory, 'income')}
            </div>
            <div class="category-section">
                <h4><i class="fas fa-arrow-trend-down"></i> Despesas por Categoria</h4>
                ${renderCategorySummary(summary.expenseByCategory, 'expense')}
            </div>
        </div>
        
        <!-- Alertas do Dashboard -->
        ${dashboard?.alerts && dashboard.alerts.length > 0 ? `
            <div class="report-messages">
                <h4><i class="fas fa-bell"></i> Alertas</h4>
                <div class="messages-list">
                    ${dashboard.alerts.map(alert => `
                        <div class="message-card ${alert.type.toLowerCase()}">
                            <div class="message-icon">
                                <i class="fas ${getMessageIcon(alert.type)}"></i>
                            </div>
                            <div class="message-content">
                                <p>${alert.message}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

function renderCategorySummary(categories, type) {
    if (!categories || categories.length === 0) {
        return `<p class="no-data">Nenhuma categoria encontrada</p>`;
    }
    
    const total = categories.reduce((sum, c) => sum + (c.total || 0), 0);
    
    return `
        <div class="category-bars">
            ${categories.slice(0, 5).map(cat => {
                const percent = total > 0 ? (cat.total / total) * 100 : 0;
                return `
                    <div class="category-bar-item">
                        <div class="category-bar-header">
                            <span class="name">${cat.categoryName || cat.name}</span>
                            <span class="value">${formatCurrency(cat.total)}</span>
                        </div>
                        <div class="category-bar-track">
                            <div class="category-bar-fill ${type}" style="width: ${percent}%"></div>
                        </div>
                        <span class="percent">${percent.toFixed(1)}%</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function getMessageIcon(type) {
    const icons = {
        SUCCESS: 'fa-check-circle',
        WARNING: 'fa-exclamation-triangle',
        DANGER: 'fa-times-circle',
        INFO: 'fa-info-circle'
    };
    return icons[type] || icons[type?.toUpperCase()] || 'fa-info-circle';
}

// ==========================================
// Eventos do Calendário
// ==========================================
let eventsData = [];
let editingEventId = null;

const eventTypes = {
    SERVICE: { label: 'Culto', icon: 'fa-church', color: 'primary' },
    EVENT: { label: 'Evento', icon: 'fa-calendar-star', color: 'success' },
    MEETING: { label: 'Reunião', icon: 'fa-users', color: 'warning' },
    REHEARSAL: { label: 'Ensaio', icon: 'fa-music', color: 'info' },
    OTHER: { label: 'Outro', icon: 'fa-calendar', color: 'gray' }
};

const eventStatuses = {
    SCHEDULED: { label: 'Agendado', color: 'primary' },
    COMPLETED: { label: 'Concluído', color: 'success' },
    CANCELED: { label: 'Cancelado', color: 'danger' }
};

async function loadEvents(container) {
    container.innerHTML = `
        <div class="dashboard-loading">
            <div class="spinner"></div>
            <p>Carregando eventos...</p>
        </div>
    `;
    
    try {
        const [events, ministries] = await Promise.all([
            apiRequest('GET', '/calendar-events'),
            apiRequest('GET', '/ministries').catch(() => [])
        ]);
        
        eventsData = events || [];
        ministriesData = ministries || [];
        
        container.innerHTML = renderEventsPage(eventsData);
        setupEventEventListeners();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Erro ao carregar eventos</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadSectionContent('events')">
                    <i class="fas fa-refresh"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

function renderEventsPage(events) {
    // Separar eventos por status
    const upcoming = events.filter(e => e.status !== 'CANCELED' && new Date(e.startDatetime) >= new Date());
    const past = events.filter(e => e.status !== 'CANCELED' && new Date(e.startDatetime) < new Date());
    const canceled = events.filter(e => e.status === 'CANCELED');
    
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Eventos do Calendário</h2>
                <p>Gerencie os eventos da igreja</p>
            </div>
            <button class="btn btn-primary" onclick="openEventModal()">
                <i class="fas fa-plus"></i>
                Novo Evento
            </button>
        </div>
        
        <!-- Contadores -->
        <div class="events-counters">
            <div class="counter-card upcoming">
                <i class="fas fa-calendar-check"></i>
                <div>
                    <span class="value">${upcoming.length}</span>
                    <span class="label">Próximos</span>
                </div>
            </div>
            <div class="counter-card past">
                <i class="fas fa-calendar-minus"></i>
                <div>
                    <span class="value">${past.length}</span>
                    <span class="label">Realizados</span>
                </div>
            </div>
            <div class="counter-card canceled">
                <i class="fas fa-calendar-xmark"></i>
                <div>
                    <span class="value">${canceled.length}</span>
                    <span class="label">Cancelados</span>
                </div>
            </div>
        </div>
        
        <!-- Lista de Eventos -->
        <div class="events-section">
            <h3><i class="fas fa-calendar-days"></i> Próximos Eventos</h3>
            ${renderEventsList(upcoming.sort((a, b) => new Date(a.startDatetime) - new Date(b.startDatetime)))}
        </div>
        
        ${past.length > 0 ? `
            <div class="events-section collapsed">
                <h3 onclick="toggleEventsSection(this)">
                    <i class="fas fa-history"></i> Eventos Realizados
                    <i class="fas fa-chevron-down toggle-icon"></i>
                </h3>
                <div class="events-section-content">
                    ${renderEventsList(past.sort((a, b) => new Date(b.startDatetime) - new Date(a.startDatetime)))}
                </div>
            </div>
        ` : ''}
        
        <!-- Modal -->
        ${renderEventModal()}
    `;
}

function renderEventsList(events) {
    if (events.length === 0) {
        return `
            <div class="empty-list">
                <i class="fas fa-calendar"></i>
                <p>Nenhum evento encontrado</p>
            </div>
        `;
    }
    
    return `
        <div class="events-list">
            ${events.map(event => {
                const typeInfo = eventTypes[event.type] || eventTypes.OTHER;
                const statusInfo = eventStatuses[event.status] || eventStatuses.SCHEDULED;
                const startDate = new Date(event.startDatetime);
                const endDate = new Date(event.endDatetime);
                
                return `
                    <div class="event-card ${typeInfo.color}">
                        <div class="event-date">
                            <span class="day">${startDate.getDate()}</span>
                            <span class="month">${getMonthShort(startDate.getMonth())}</span>
                            <span class="year">${startDate.getFullYear()}</span>
                        </div>
                        <div class="event-info">
                            <div class="event-header">
                                <h4>${event.title}</h4>
                                <span class="event-type-badge ${typeInfo.color}">
                                    <i class="fas ${typeInfo.icon}"></i>
                                    ${typeInfo.label}
                                </span>
                            </div>
                            <div class="event-meta">
                                <span class="event-time">
                                    <i class="fas fa-clock"></i>
                                    ${formatTime(startDate)} - ${formatTime(endDate)}
                                </span>
                                ${event.location ? `
                                    <span class="event-location">
                                        <i class="fas fa-map-marker-alt"></i>
                                        ${event.location}
                                    </span>
                                ` : ''}
                                ${event.ministry ? `
                                    <span class="event-ministry">
                                        <i class="fas fa-hands-praying"></i>
                                        ${event.ministry.name}
                                    </span>
                                ` : ''}
                            </div>
                            ${event.description ? `
                                <p class="event-description">${event.description}</p>
                            ` : ''}
                        </div>
                        <div class="event-actions">
                            <span class="status-badge ${statusInfo.color}">${statusInfo.label}</span>
                            <div class="action-buttons">
                                <button class="btn-icon" onclick="editEvent('${event.id}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                ${event.status !== 'CANCELED' ? `
                                    <button class="btn-icon warning" onclick="cancelEvent('${event.id}')" title="Cancelar">
                                        <i class="fas fa-ban"></i>
                                    </button>
                                ` : ''}
                                <button class="btn-icon danger" onclick="deleteEvent('${event.id}')" title="Excluir">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderEventModal() {
    return `
        <div id="event-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeEventModal()"></div>
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3 id="event-modal-title">Novo Evento</h3>
                    <button class="modal-close" onclick="closeEventModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="event-form" class="modal-body">
                    <div class="form-group">
                        <label for="event-title">Título *</label>
                        <input type="text" id="event-title" placeholder="Nome do evento" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="event-type">Tipo *</label>
                            <select id="event-type" required>
                                <option value="">Selecione</option>
                                <option value="SERVICE">Culto</option>
                                <option value="EVENT">Evento</option>
                                <option value="MEETING">Reunião</option>
                                <option value="REHEARSAL">Ensaio</option>
                                <option value="OTHER">Outro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="event-ministry">Ministério (opcional)</label>
                            <select id="event-ministry">
                                <option value="">Nenhum</option>
                                ${ministriesData.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="event-start">Início *</label>
                            <input type="datetime-local" id="event-start" required>
                        </div>
                        <div class="form-group">
                            <label for="event-end">Término *</label>
                            <input type="datetime-local" id="event-end" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="event-location">Local</label>
                        <input type="text" id="event-location" placeholder="Ex: Templo Principal">
                    </div>
                    
                    <div class="form-group">
                        <label for="event-description">Descrição</label>
                        <textarea id="event-description" rows="2" placeholder="Detalhes do evento..."></textarea>
                    </div>
                    
                    <div class="form-group" id="event-status-group" style="display: none;">
                        <label for="event-status">Status</label>
                        <select id="event-status">
                            <option value="SCHEDULED">Agendado</option>
                            <option value="COMPLETED">Concluído</option>
                            <option value="CANCELED">Cancelado</option>
                        </select>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeEventModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function setupEventEventListeners() {
    const form = document.getElementById('event-form');
    if (form) {
        form.addEventListener('submit', handleEventSubmit);
    }
}

function openEventModal(eventId = null) {
    editingEventId = eventId;
    const modal = document.getElementById('event-modal');
    const title = document.getElementById('event-modal-title');
    const form = document.getElementById('event-form');
    const statusGroup = document.getElementById('event-status-group');
    
    form.reset();
    statusGroup.style.display = 'none';
    
    // Data/hora padrão: próxima hora cheia
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 horas
    
    document.getElementById('event-start').value = formatDateTimeLocal(now);
    document.getElementById('event-end').value = formatDateTimeLocal(end);
    
    if (eventId) {
        title.textContent = 'Editar Evento';
        statusGroup.style.display = 'block';
        const event = eventsData.find(e => e.id === eventId);
        if (event) {
            document.getElementById('event-title').value = event.title;
            document.getElementById('event-type').value = event.type;
            document.getElementById('event-ministry').value = event.ministryId || '';
            document.getElementById('event-start').value = formatDateTimeLocal(new Date(event.startDatetime));
            document.getElementById('event-end').value = formatDateTimeLocal(new Date(event.endDatetime));
            document.getElementById('event-location').value = event.location || '';
            document.getElementById('event-description').value = event.description || '';
            document.getElementById('event-status').value = event.status || 'SCHEDULED';
        }
    } else {
        title.textContent = 'Novo Evento';
    }
    
    modal.classList.remove('hidden');
}

function closeEventModal() {
    const modal = document.getElementById('event-modal');
    modal.classList.add('hidden');
    editingEventId = null;
}

async function handleEventSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('event-title').value;
    const type = document.getElementById('event-type').value;
    const ministryId = document.getElementById('event-ministry').value || null;
    const startDatetime = new Date(document.getElementById('event-start').value).toISOString();
    const endDatetime = new Date(document.getElementById('event-end').value).toISOString();
    const location = document.getElementById('event-location').value;
    const description = document.getElementById('event-description').value;
    const status = document.getElementById('event-status').value;
    
    const data = {
        churchId: state.church?.id,
        title,
        type,
        ministryId,
        startDatetime,
        endDatetime,
        location,
        description,
        createdByUserId: state.user?.id
    };
    
    showLoading();
    
    try {
        if (editingEventId) {
            await apiRequest('PUT', `/calendar-events/${editingEventId}`, {
                title,
                type,
                ministryId,
                startDatetime,
                endDatetime,
                location,
                description,
                status
            });
            showToast('success', 'Evento atualizado!', 'O evento foi atualizado com sucesso.');
        } else {
            await apiRequest('POST', '/calendar-events', data);
            showToast('success', 'Evento criado!', 'O novo evento foi agendado.');
        }
        
        closeEventModal();
        await loadSectionContent('events');
        
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível salvar o evento.');
    } finally {
        hideLoading();
    }
}

function editEvent(eventId) {
    openEventModal(eventId);
}

async function cancelEvent(eventId) {
    if (!confirm('Deseja cancelar este evento?')) {
        return;
    }
    
    showLoading();
    
    try {
        await apiRequest('PUT', `/calendar-events/${eventId}`, { status: 'CANCELED' });
        showToast('success', 'Evento cancelado!', 'O evento foi marcado como cancelado.');
        await loadSectionContent('events');
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível cancelar o evento.');
    } finally {
        hideLoading();
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Deseja realmente excluir este evento?')) {
        return;
    }
    
    showLoading();
    
    try {
        await apiRequest('DELETE', `/calendar-events/${eventId}`);
        showToast('success', 'Evento excluído!', 'O evento foi removido.');
        await loadSectionContent('events');
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível excluir o evento.');
    } finally {
        hideLoading();
    }
}

function toggleEventsSection(header) {
    const section = header.closest('.events-section');
    section.classList.toggle('collapsed');
}

// ==========================================
// Eventos Recorrentes
// ==========================================
let recurringEventsData = [];
let editingRecurringEventId = null;

async function loadRecurringEvents(container) {
    container.innerHTML = `
        <div class="dashboard-loading">
            <div class="spinner"></div>
            <p>Carregando eventos recorrentes...</p>
        </div>
    `;
    
    try {
        const [events, ministries] = await Promise.all([
            apiRequest('GET', '/calendar-recurring-events'),
            apiRequest('GET', '/ministries').catch(() => [])
        ]);
        
        recurringEventsData = events || [];
        ministriesData = ministries || [];
        
        container.innerHTML = renderRecurringEventsPage(recurringEventsData);
        setupRecurringEventEventListeners();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Erro ao carregar eventos recorrentes</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadSectionContent('recurring-events')">
                    <i class="fas fa-refresh"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

function renderRecurringEventsPage(events) {
    const activeEvents = events.filter(e => e.active !== false);
    
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Eventos Recorrentes</h2>
                <p>Eventos que se repetem automaticamente</p>
            </div>
            <button class="btn btn-primary" onclick="openRecurringEventModal()">
                <i class="fas fa-plus"></i>
                Novo Evento Recorrente
            </button>
        </div>
        
        <!-- Resumo -->
        <div class="events-counters">
            <div class="counter-card primary">
                <i class="fas fa-repeat"></i>
                <div>
                    <span class="value">${activeEvents.length}</span>
                    <span class="label">Ativos</span>
                </div>
            </div>
            <div class="counter-card gray">
                <i class="fas fa-pause"></i>
                <div>
                    <span class="value">${events.length - activeEvents.length}</span>
                    <span class="label">Inativos</span>
                </div>
            </div>
        </div>
        
        <!-- Lista -->
        <div class="card">
            <div class="card-body">
                ${renderRecurringEventsList(events)}
            </div>
        </div>
        
        <!-- Modal -->
        ${renderRecurringEventModal()}
    `;
}

function renderRecurringEventsList(events) {
    if (events.length === 0) {
        return `
            <div class="empty-list">
                <i class="fas fa-calendar-check"></i>
                <p>Nenhum evento recorrente cadastrado</p>
            </div>
        `;
    }
    
    return `
        <div class="recurring-events-list">
            ${events.map(event => {
                const typeInfo = eventTypes[event.type] || eventTypes.OTHER;
                
                return `
                    <div class="recurring-event-item ${event.active === false ? 'inactive' : ''}">
                        <div class="recurring-event-icon ${typeInfo.color}">
                            <i class="fas ${typeInfo.icon}"></i>
                        </div>
                        <div class="recurring-event-info">
                            <h4>${event.title}</h4>
                            <div class="recurring-event-meta">
                                <span class="frequency">
                                    <i class="fas fa-repeat"></i>
                                    ${formatEventFrequency(event)}
                                </span>
                                <span class="time">
                                    <i class="fas fa-clock"></i>
                                    ${event.startTime} - ${event.endTime}
                                </span>
                                ${event.location ? `
                                    <span class="location">
                                        <i class="fas fa-map-marker-alt"></i>
                                        ${event.location}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                        <div class="recurring-event-status">
                            <span class="status-badge ${event.active !== false ? 'active' : 'inactive'}">
                                ${event.active !== false ? 'Ativo' : 'Inativo'}
                            </span>
                        </div>
                        <div class="recurring-event-actions">
                            <button class="btn-icon" onclick="editRecurringEvent('${event.id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon ${event.active !== false ? 'warning' : 'success'}" 
                                    onclick="toggleRecurringEvent('${event.id}', ${event.active !== false})" 
                                    title="${event.active !== false ? 'Desativar' : 'Ativar'}">
                                <i class="fas fa-${event.active !== false ? 'pause' : 'play'}"></i>
                            </button>
                            <button class="btn-icon danger" onclick="deleteRecurringEvent('${event.id}')" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderRecurringEventModal() {
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    return `
        <div id="recurring-event-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeRecurringEventModal()"></div>
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3 id="recurring-event-modal-title">Novo Evento Recorrente</h3>
                    <button class="modal-close" onclick="closeRecurringEventModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="recurring-event-form" class="modal-body">
                    <div class="form-group">
                        <label for="rec-event-title">Título *</label>
                        <input type="text" id="rec-event-title" placeholder="Nome do evento" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="rec-event-frequency">Frequência *</label>
                            <select id="rec-event-frequency" required onchange="updateRecurringEventFields()">
                                <option value="">Selecione</option>
                                <option value="WEEKLY">Semanal</option>
                                <option value="MONTHLY">Mensal</option>
                            </select>
                        </div>
                        <div class="form-group" id="weekday-group" style="display: none;">
                            <label for="rec-event-weekday">Dia da Semana *</label>
                            <select id="rec-event-weekday">
                                ${weekdays.map((d, i) => `<option value="${i}">${d}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" id="monthday-group" style="display: none;">
                            <label for="rec-event-monthday">Dia do Mês *</label>
                            <input type="number" id="rec-event-monthday" min="1" max="31" placeholder="1-31">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="rec-event-start-time">Hora Início *</label>
                            <input type="time" id="rec-event-start-time" required>
                        </div>
                        <div class="form-group">
                            <label for="rec-event-end-time">Hora Término *</label>
                            <input type="time" id="rec-event-end-time" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="rec-event-start-date">Data de Início *</label>
                        <input type="date" id="rec-event-start-date" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="rec-event-location">Local</label>
                        <input type="text" id="rec-event-location" placeholder="Ex: Templo Principal">
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="rec-event-active" checked>
                            <span>Evento ativo</span>
                        </label>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeRecurringEventModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function setupRecurringEventEventListeners() {
    const form = document.getElementById('recurring-event-form');
    if (form) {
        form.addEventListener('submit', handleRecurringEventSubmit);
    }
}

function updateRecurringEventFields() {
    const frequency = document.getElementById('rec-event-frequency').value;
    const weekdayGroup = document.getElementById('weekday-group');
    const monthdayGroup = document.getElementById('monthday-group');
    
    weekdayGroup.style.display = frequency === 'WEEKLY' ? 'block' : 'none';
    monthdayGroup.style.display = frequency === 'MONTHLY' ? 'block' : 'none';
}

function openRecurringEventModal(eventId = null) {
    editingRecurringEventId = eventId;
    const modal = document.getElementById('recurring-event-modal');
    const title = document.getElementById('recurring-event-modal-title');
    const form = document.getElementById('recurring-event-form');
    
    form.reset();
    document.getElementById('rec-event-active').checked = true;
    document.getElementById('rec-event-start-date').value = new Date().toISOString().split('T')[0];
    updateRecurringEventFields();
    
    if (eventId) {
        title.textContent = 'Editar Evento Recorrente';
        const event = recurringEventsData.find(e => e.id === eventId);
        if (event) {
            document.getElementById('rec-event-title').value = event.title;
            document.getElementById('rec-event-frequency').value = event.frequency;
            updateRecurringEventFields();
            if (event.weekday !== undefined) {
                document.getElementById('rec-event-weekday').value = event.weekday;
            }
            if (event.monthDay) {
                document.getElementById('rec-event-monthday').value = event.monthDay;
            }
            document.getElementById('rec-event-start-time').value = event.startTime;
            document.getElementById('rec-event-end-time').value = event.endTime;
            document.getElementById('rec-event-start-date').value = event.startDate?.split('T')[0] || '';
            document.getElementById('rec-event-location').value = event.location || '';
            document.getElementById('rec-event-active').checked = event.active !== false;
        }
    } else {
        title.textContent = 'Novo Evento Recorrente';
    }
    
    modal.classList.remove('hidden');
}

function closeRecurringEventModal() {
    const modal = document.getElementById('recurring-event-modal');
    modal.classList.add('hidden');
    editingRecurringEventId = null;
}

async function handleRecurringEventSubmit(e) {
    e.preventDefault();
    
    const frequency = document.getElementById('rec-event-frequency').value;
    
    const data = {
        churchId: state.church?.id,
        title: document.getElementById('rec-event-title').value,
        frequency,
        weekday: frequency === 'WEEKLY' ? parseInt(document.getElementById('rec-event-weekday').value) : undefined,
        monthDay: frequency === 'MONTHLY' ? parseInt(document.getElementById('rec-event-monthday').value) : undefined,
        startTime: document.getElementById('rec-event-start-time').value,
        endTime: document.getElementById('rec-event-end-time').value,
        startDate: document.getElementById('rec-event-start-date').value,
        location: document.getElementById('rec-event-location').value,
        active: document.getElementById('rec-event-active').checked,
        createdByUserId: state.user?.id
    };
    
    showLoading();
    
    try {
        if (editingRecurringEventId) {
            await apiRequest('PUT', `/calendar-recurring-events/${editingRecurringEventId}`, data);
            showToast('success', 'Evento atualizado!', 'O evento recorrente foi atualizado.');
        } else {
            await apiRequest('POST', '/calendar-recurring-events', data);
            showToast('success', 'Evento criado!', 'O novo evento recorrente foi criado.');
        }
        
        closeRecurringEventModal();
        await loadSectionContent('recurring-events');
        
    } catch (error) {
        showToast('error', 'Erro', error.message || 'Não foi possível salvar.');
    } finally {
        hideLoading();
    }
}

function editRecurringEvent(eventId) {
    openRecurringEventModal(eventId);
}

async function toggleRecurringEvent(eventId, isActive) {
    showLoading();
    
    try {
        await apiRequest('PUT', `/calendar-recurring-events/${eventId}`, { active: !isActive });
        showToast('success', isActive ? 'Desativado!' : 'Ativado!', 
            `O evento foi ${isActive ? 'desativado' : 'ativado'}.`);
        await loadSectionContent('recurring-events');
    } catch (error) {
        showToast('error', 'Erro', error.message);
    } finally {
        hideLoading();
    }
}

async function deleteRecurringEvent(eventId) {
    if (!confirm('Deseja realmente excluir este evento recorrente?')) {
        return;
    }
    
    showLoading();
    
    try {
        await apiRequest('DELETE', `/calendar-recurring-events/${eventId}`);
        showToast('success', 'Excluído!', 'O evento recorrente foi removido.');
        await loadSectionContent('recurring-events');
    } catch (error) {
        showToast('error', 'Erro', error.message);
    } finally {
        hideLoading();
    }
}

function formatEventFrequency(event) {
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    if (event.frequency === 'WEEKLY' && event.weekday !== undefined) {
        return `Todo(a) ${weekdays[event.weekday]}`;
    }
    if (event.frequency === 'MONTHLY' && event.monthDay) {
        return `Todo dia ${event.monthDay}`;
    }
    return formatFrequency(event.frequency);
}

// ==========================================
// Formatadores
// ==========================================
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

function formatTime(date) {
    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function formatDateTimeLocal(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getMonthShort(month) {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[month];
}

// ==========================================
// Empresas
// ==========================================
let companiesData = [];
let editingCompanyId = null;

async function loadCompanies(container) {
    container.innerHTML = `<div class="dashboard-loading"><div class="spinner"></div><p>Carregando...</p></div>`;
    
    try {
        companiesData = await apiRequest('GET', '/companies');
        container.innerHTML = renderCompaniesPage(companiesData);
        setupCompanyListeners();
    } catch (error) {
        container.innerHTML = `<div class="empty-state error"><i class="fas fa-exclamation-circle"></i><h3>Erro</h3><p>${error.message}</p></div>`;
    }
}

function renderCompaniesPage(companies) {
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Empresas</h2>
                <p>Organizações cadastradas no sistema</p>
            </div>
        </div>
        
        <div class="card">
            <div class="table-container">
                ${companies.length === 0 ? `
                    <div class="empty-list"><i class="fas fa-building"></i><p>Nenhuma empresa encontrada</p></div>
                ` : `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Documento</th>
                                <th>Endereço</th>
                                <th>Status</th>
                                <th class="text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${companies.map(c => `
                                <tr>
                                    <td><strong>${c.name}</strong></td>
                                    <td>${c.document || '-'}</td>
                                    <td>${c.address || '-'}</td>
                                    <td><span class="status-badge ${c.onboardingStep === 'COMPLETED' ? 'active' : 'warning'}">${c.onboardingStep === 'COMPLETED' ? 'Ativo' : c.onboardingStep}</span></td>
                                    <td class="text-center">
                                        <div class="table-actions">
                                            <button class="btn-icon" onclick="editCompany('${c.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        </div>
        
        <div id="company-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeCompanyModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Editar Empresa</h3>
                    <button class="modal-close" onclick="closeCompanyModal()"><i class="fas fa-times"></i></button>
                </div>
                <form id="company-form" class="modal-body">
                    <div class="form-group">
                        <label>Nome *</label>
                        <input type="text" id="company-name-edit" required>
                    </div>
                    <div class="form-group">
                        <label>Endereço</label>
                        <input type="text" id="company-address-edit">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeCompanyModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function setupCompanyListeners() {
    document.getElementById('company-form')?.addEventListener('submit', handleCompanySubmit);
}

function editCompany(id) {
    editingCompanyId = id;
    const company = companiesData.find(c => c.id === id);
    if (company) {
        document.getElementById('company-name-edit').value = company.name;
        document.getElementById('company-address-edit').value = company.address || '';
        document.getElementById('company-modal').classList.remove('hidden');
    }
}

function closeCompanyModal() {
    document.getElementById('company-modal').classList.add('hidden');
}

async function handleCompanySubmit(e) {
    e.preventDefault();
    showLoading();
    try {
        await apiRequest('PUT', `/companies/${editingCompanyId}`, {
            name: document.getElementById('company-name-edit').value,
            address: document.getElementById('company-address-edit').value
        });
        showToast('success', 'Empresa atualizada!', '');
        closeCompanyModal();
        await loadSectionContent('companies');
    } catch (error) {
        showToast('error', 'Erro', error.message);
    } finally {
        hideLoading();
    }
}

// ==========================================
// Igrejas
// ==========================================
let churchesData = [];
let editingChurchId = null;

async function loadChurches(container) {
    container.innerHTML = `<div class="dashboard-loading"><div class="spinner"></div><p>Carregando...</p></div>`;
    
    try {
        churchesData = await apiRequest('GET', '/churches');
        container.innerHTML = renderChurchesPage(churchesData);
        setupChurchListeners();
    } catch (error) {
        container.innerHTML = `<div class="empty-state error"><i class="fas fa-exclamation-circle"></i><h3>Erro</h3><p>${error.message}</p></div>`;
    }
}

function renderChurchesPage(churches) {
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Igrejas</h2>
                <p>Unidades da organização</p>
            </div>
            <button class="btn btn-primary" onclick="openChurchModal()"><i class="fas fa-plus"></i> Nova Igreja</button>
        </div>
        
        <div class="entities-grid">
            ${churches.length === 0 ? `
                <div class="empty-state"><i class="fas fa-church"></i><h3>Nenhuma igreja</h3></div>
            ` : churches.map(c => `
                <div class="entity-card">
                    <div class="entity-icon church"><i class="fas fa-church"></i></div>
                    <div class="entity-info">
                        <h4>${c.name}</h4>
                        <p>${c.description || 'Sem descrição'}</p>
                        <span class="entity-meta"><i class="fas fa-map-marker-alt"></i> ${c.address || 'Endereço não informado'}</span>
                    </div>
                    <div class="entity-actions">
                        <button class="btn-icon" onclick="editChurch('${c.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon danger" onclick="deleteChurch('${c.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div id="church-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeChurchModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="church-modal-title">Nova Igreja</h3>
                    <button class="modal-close" onclick="closeChurchModal()"><i class="fas fa-times"></i></button>
                </div>
                <form id="church-form" class="modal-body">
                    <div class="form-group"><label>Nome *</label><input type="text" id="church-name-edit" required></div>
                    <div class="form-group"><label>Descrição</label><input type="text" id="church-desc-edit"></div>
                    <div class="form-group"><label>Endereço</label><input type="text" id="church-addr-edit"></div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeChurchModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function setupChurchListeners() {
    document.getElementById('church-form')?.addEventListener('submit', handleChurchSubmit);
}

function openChurchModal(id = null) {
    editingChurchId = id;
    const form = document.getElementById('church-form');
    form.reset();
    document.getElementById('church-modal-title').textContent = id ? 'Editar Igreja' : 'Nova Igreja';
    if (id) {
        const church = churchesData.find(c => c.id === id);
        if (church) {
            document.getElementById('church-name-edit').value = church.name;
            document.getElementById('church-desc-edit').value = church.description || '';
            document.getElementById('church-addr-edit').value = church.address || '';
        }
    }
    document.getElementById('church-modal').classList.remove('hidden');
}

function editChurch(id) { openChurchModal(id); }
function closeChurchModal() { document.getElementById('church-modal').classList.add('hidden'); }

async function handleChurchSubmit(e) {
    e.preventDefault();
    showLoading();
    const data = {
        name: document.getElementById('church-name-edit').value,
        description: document.getElementById('church-desc-edit').value,
        address: document.getElementById('church-addr-edit').value
    };
    try {
        if (editingChurchId) {
            await apiRequest('PUT', `/churches/${editingChurchId}`, data);
            showToast('success', 'Igreja atualizada!', '');
        } else {
            await apiRequest('POST', '/churches', { ...data, companyId: state.company?.id });
            showToast('success', 'Igreja criada!', '');
        }
        closeChurchModal();
        await loadSectionContent('churches');
    } catch (error) {
        showToast('error', 'Erro', error.message);
    } finally {
        hideLoading();
    }
}

async function deleteChurch(id) {
    if (!confirm('Excluir esta igreja?')) return;
    showLoading();
    try {
        await apiRequest('DELETE', `/churches/${id}`);
        showToast('success', 'Igreja excluída!', '');
        await loadSectionContent('churches');
    } catch (error) {
        showToast('error', 'Erro', error.message);
    } finally {
        hideLoading();
    }
}

// ==========================================
// Usuários
// ==========================================
let usersData = [];
let editingUserId = null;

const userRoles = {
    ADMIN: { label: 'Administrador', color: 'danger' },
    PASTOR: { label: 'Pastor', color: 'primary' },
    SECRETARY: { label: 'Secretário', color: 'warning' },
    LEADER: { label: 'Líder', color: 'info' },
    MEMBER: { label: 'Membro', color: 'gray' }
};

async function loadUsers(container) {
    container.innerHTML = `<div class="dashboard-loading"><div class="spinner"></div><p>Carregando...</p></div>`;
    
    try {
        const [users, churches] = await Promise.all([
            apiRequest('GET', '/users'),
            apiRequest('GET', '/churches').catch(() => [])
        ]);
        usersData = users || [];
        churchesData = churches || [];
        container.innerHTML = renderUsersPage(usersData);
        setupUserListeners();
    } catch (error) {
        container.innerHTML = `<div class="empty-state error"><i class="fas fa-exclamation-circle"></i><h3>Erro</h3><p>${error.message}</p></div>`;
    }
}

function renderUsersPage(users) {
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Usuários</h2>
                <p>Gerenciar usuários do sistema</p>
            </div>
            <button class="btn btn-primary" onclick="openUserModal()"><i class="fas fa-plus"></i> Novo Usuário</button>
        </div>
        
        <div class="card">
            <div class="table-container">
                ${users.length === 0 ? `
                    <div class="empty-list"><i class="fas fa-users"></i><p>Nenhum usuário encontrado</p></div>
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
                                                <div class="user-avatar-sm"><i class="fas fa-user"></i></div>
                                                <strong>${u.name}</strong>
                                            </div>
                                        </td>
                                        <td>${u.email}</td>
                                        <td><span class="role-badge ${role.color}">${role.label}</span></td>
                                        <td>${u.church?.name || '-'}</td>
                                        <td><span class="status-badge ${u.active !== false ? 'active' : 'inactive'}">${u.active !== false ? 'Ativo' : 'Inativo'}</span></td>
                                        <td class="text-center">
                                            <div class="table-actions">
                                                <button class="btn-icon" onclick="editUser('${u.id}')"><i class="fas fa-edit"></i></button>
                                                <button class="btn-icon danger" onclick="deleteUser('${u.id}')"><i class="fas fa-trash"></i></button>
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
        
        <div id="user-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeUserModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="user-modal-title">Novo Usuário</h3>
                    <button class="modal-close" onclick="closeUserModal()"><i class="fas fa-times"></i></button>
                </div>
                <form id="user-form" class="modal-body">
                    <div class="form-group"><label>Nome *</label><input type="text" id="user-name-edit" required></div>
                    <div class="form-group"><label>Email *</label><input type="email" id="user-email-edit" required></div>
                    <div class="form-group" id="user-password-group"><label>Senha *</label><input type="password" id="user-password-edit" minlength="6"></div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Função *</label>
                            <select id="user-role-edit" required>
                                <option value="ADMIN">Administrador</option>
                                <option value="PASTOR">Pastor</option>
                                <option value="SECRETARY">Secretário</option>
                                <option value="LEADER">Líder</option>
                                <option value="MEMBER">Membro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Igreja *</label>
                            <select id="user-church-edit" required>
                                ${churchesData.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label"><input type="checkbox" id="user-active-edit" checked><span>Usuário ativo</span></label>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeUserModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function setupUserListeners() {
    document.getElementById('user-form')?.addEventListener('submit', handleUserSubmit);
}

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

function editUser(id) { openUserModal(id); }
function closeUserModal() { document.getElementById('user-modal').classList.add('hidden'); }

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

async function deleteUser(id) {
    if (!confirm('Excluir este usuário?')) return;
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

// ==========================================
// Ministérios
// ==========================================
let ministriesFullData = [];
let editingMinistryId = null;

async function loadMinistries(container) {
    container.innerHTML = `<div class="dashboard-loading"><div class="spinner"></div><p>Carregando...</p></div>`;
    
    try {
        const [ministries, users] = await Promise.all([
            apiRequest('GET', '/ministries'),
            apiRequest('GET', '/users').catch(() => [])
        ]);
        ministriesFullData = ministries || [];
        usersData = users || [];
        container.innerHTML = renderMinistriesPage(ministriesFullData);
        setupMinistryListeners();
    } catch (error) {
        container.innerHTML = `<div class="empty-state error"><i class="fas fa-exclamation-circle"></i><h3>Erro</h3><p>${error.message}</p></div>`;
    }
}

function renderMinistriesPage(ministries) {
    return `
        <div class="page-header">
            <div class="page-header-content">
                <h2>Ministérios</h2>
                <p>Áreas de atuação da igreja</p>
            </div>
            <button class="btn btn-primary" onclick="openMinistryModal()"><i class="fas fa-plus"></i> Novo Ministério</button>
        </div>
        
        <div class="entities-grid">
            ${ministries.length === 0 ? `
                <div class="empty-state"><i class="fas fa-hands-praying"></i><h3>Nenhum ministério</h3></div>
            ` : ministries.map(m => `
                <div class="entity-card">
                    <div class="entity-icon ministry"><i class="fas fa-hands-praying"></i></div>
                    <div class="entity-info">
                        <h4>${m.name}</h4>
                        <p>${m.description || 'Sem descrição'}</p>
                        ${m.leader ? `<span class="entity-meta"><i class="fas fa-user"></i> Líder: ${m.leader.name}</span>` : ''}
                    </div>
                    <div class="entity-actions">
                        <button class="btn-icon" onclick="editMinistry('${m.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon danger" onclick="deleteMinistry('${m.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div id="ministry-modal" class="modal hidden">
            <div class="modal-backdrop" onclick="closeMinistryModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="ministry-modal-title">Novo Ministério</h3>
                    <button class="modal-close" onclick="closeMinistryModal()"><i class="fas fa-times"></i></button>
                </div>
                <form id="ministry-form" class="modal-body">
                    <div class="form-group"><label>Nome *</label><input type="text" id="ministry-name-edit" required></div>
                    <div class="form-group"><label>Descrição</label><textarea id="ministry-desc-edit" rows="2"></textarea></div>
                    <div class="form-group">
                        <label>Líder</label>
                        <select id="ministry-leader-edit">
                            <option value="">Nenhum</option>
                            ${usersData.filter(u => ['LEADER', 'PASTOR', 'ADMIN'].includes(u.role)).map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeMinistryModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function setupMinistryListeners() {
    document.getElementById('ministry-form')?.addEventListener('submit', handleMinistrySubmit);
}

function openMinistryModal(id = null) {
    editingMinistryId = id;
    const form = document.getElementById('ministry-form');
    form.reset();
    document.getElementById('ministry-modal-title').textContent = id ? 'Editar Ministério' : 'Novo Ministério';
    
    if (id) {
        const ministry = ministriesFullData.find(m => m.id === id);
        if (ministry) {
            document.getElementById('ministry-name-edit').value = ministry.name;
            document.getElementById('ministry-desc-edit').value = ministry.description || '';
            document.getElementById('ministry-leader-edit').value = ministry.leaderUserId || '';
        }
    }
    document.getElementById('ministry-modal').classList.remove('hidden');
}

function editMinistry(id) { openMinistryModal(id); }
function closeMinistryModal() { document.getElementById('ministry-modal').classList.add('hidden'); }

async function handleMinistrySubmit(e) {
    e.preventDefault();
    showLoading();
    const data = {
        churchId: state.church?.id,
        name: document.getElementById('ministry-name-edit').value,
        description: document.getElementById('ministry-desc-edit').value,
        leaderUserId: document.getElementById('ministry-leader-edit').value || null
    };
    
    try {
        if (editingMinistryId) {
            await apiRequest('PUT', `/ministries/${editingMinistryId}`, data);
            showToast('success', 'Ministério atualizado!', '');
        } else {
            await apiRequest('POST', '/ministries', data);
            showToast('success', 'Ministério criado!', '');
        }
        closeMinistryModal();
        await loadSectionContent('ministries');
    } catch (error) {
        showToast('error', 'Erro', error.message);
    } finally {
        hideLoading();
    }
}

async function deleteMinistry(id) {
    if (!confirm('Excluir este ministério?')) return;
    showLoading();
    try {
        await apiRequest('DELETE', `/ministries/${id}`);
        showToast('success', 'Ministério excluído!', '');
        await loadSectionContent('ministries');
    } catch (error) {
        showToast('error', 'Erro', error.message);
    } finally {
        hideLoading();
    }
}

function formatCurrencyShort(value) {
    if (value >= 1000000) {
        return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
        return `R$ ${(value / 1000).toFixed(1)}K`;
    }
    return `R$ ${value.toFixed(0)}`;
}

// ==========================================
// Logout
// ==========================================
function logout() {
    state.token = null;
    state.user = null;
    state.company = null;
    state.church = null;
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
    localStorage.removeItem('church');
    
    showScreen('login-screen');
    
    // Limpar formulários
    document.getElementById('login-form').reset();
    document.getElementById('onboarding-step1').reset();
    document.getElementById('onboarding-step2').reset();
    document.getElementById('onboarding-step3').reset();
    
    goToStep(1);
}

// ==========================================
// Atualização da UI
// ==========================================
function updateUserInfo() {
    if (state.user) {
        document.getElementById('user-name').textContent = state.user.name || 'Usuário';
        document.getElementById('user-role').textContent = formatRole(state.user.role);
    }
    
    if (state.church) {
        document.getElementById('current-church').textContent = state.church.name;
    }
    
    // Carregar o dashboard
    loadSectionContent('dashboard');
}

function formatRole(role) {
    const roles = {
        ADMIN: 'Administrador',
        PASTOR: 'Pastor',
        SECRETARY: 'Secretário',
        LEADER: 'Líder',
        MEMBER: 'Membro'
    };
    return roles[role] || role;
}

// ==========================================
// Utilitários - Toggle Password
// ==========================================
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

// ==========================================
// API Request Helper
// ==========================================
async function apiRequest(method, endpoint, data = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
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

// ==========================================
// Toast Notifications
// ==========================================
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

function closeToast(button) {
    const toast = button.closest('.toast');
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
}

// ==========================================
// Loading Overlay
// ==========================================
function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}
