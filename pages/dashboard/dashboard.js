// ==========================================
// Dashboard - Página Principal
// ==========================================

/**
 * Carrega o conteúdo do dashboard
 * @param {HTMLElement} container - Container onde o conteúdo será renderizado
 */
async function loadDashboard(container) {
    container.innerHTML = `
        <div class="dashboard-loading">
            <div class="spinner"></div>
            <p>Carregando dashboard...</p>
        </div>
    `;
    
    try {
        if (!AppState.church?.id) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-church"></i>
                    <h3>Nenhuma igreja selecionada</h3>
                    <p>Selecione uma igreja para visualizar o dashboard</p>
                </div>
            `;
            return;
        }
        
        const churchId = AppState.church.id;
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        
        // Buscar dados do dashboard
        const [summary, dashboard, comparison, entriesFiltered, entriesAll] = await Promise.all([
            apiRequest('GET', `/reports/church/summary?churchId=${churchId}`).catch(e => null),
            apiRequest('GET', `/reports/church/dashboard?churchId=${churchId}`).catch(e => null),
            apiRequest('GET', `/reports/church/comparison?churchId=${churchId}&month=${currentMonth}&year=${currentYear}`).catch(e => null),
            apiRequest('GET', `/financial-entries?churchId=${churchId}`).catch(e => []),
            apiRequest('GET', `/financial-entries`).catch(e => [])
        ]);
        
        // Usar lançamentos filtrados ou todos
        const entries = (entriesFiltered && entriesFiltered.length > 0) ? entriesFiltered : entriesAll;
        
        // Verificar se há dados
        const totalIncomeNum = parseFloat(summary?.totalIncome) || 0;
        const totalExpenseNum = parseFloat(summary?.totalExpense) || 0;
        const hasData = (totalIncomeNum > 0 || totalExpenseNum > 0) || 
                        (Array.isArray(entries) && entries.length > 0);
        
        if (!hasData) {
            container.innerHTML = renderEmptyDashboard();
            return;
        }
        
        container.innerHTML = renderDashboard(summary, dashboard, comparison, entries);
        
        // Renderizar gráfico após inserir o HTML
        if (dashboard?.monthlyEvolution && dashboard.monthlyEvolution.length > 0) {
            renderChart(dashboard.monthlyEvolution);
        } else if (entries && entries.length > 0) {
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

/**
 * Renderiza o dashboard vazio (sem dados)
 * @returns {string} HTML do dashboard vazio
 */
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
                        Adicionar Lançamento
                    </button>
                </div>
            </div>
            
            <div class="quick-stats">
                <div class="quick-stat-card">
                    <i class="fas fa-church"></i>
                    <span>${AppState.church?.name || 'Igreja'}</span>
                </div>
                <div class="quick-stat-card">
                    <i class="fas fa-user"></i>
                    <span>${AppState.user?.name || 'Usuário'}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza o dashboard com dados
 * @param {object} summary - Resumo financeiro
 * @param {object} dashboard - Dados do dashboard
 * @param {object} comparison - Comparação com período anterior
 * @param {array} entries - Lançamentos
 * @returns {string} HTML do dashboard
 */
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

/**
 * Renderiza a lista de alertas
 * @param {array} messages - Mensagens
 * @param {array} alerts - Alertas
 * @returns {string} HTML dos alertas
 */
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

/**
 * Retorna o ícone para um tipo de alerta
 * @param {string} type - Tipo do alerta
 * @returns {string} Classe do ícone
 */
function getAlertIcon(type) {
    const icons = {
        SUCCESS: 'fa-check-circle',
        WARNING: 'fa-exclamation-triangle',
        DANGER: 'fa-times-circle',
        INFO: 'fa-info-circle'
    };
    return icons[type] || icons[type?.toUpperCase()] || 'fa-info-circle';
}

/**
 * Renderiza a lista de categorias top
 * @param {array} categories - Categorias
 * @param {string} type - Tipo (income/expense)
 * @returns {string} HTML das categorias
 */
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

/**
 * Cria dados mensais a partir dos lançamentos
 * @param {array} entries - Lançamentos
 * @returns {array} Dados mensais
 */
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

/**
 * Calcula categorias a partir dos lançamentos
 * @param {array} entries - Lançamentos
 * @param {string} type - Tipo (INCOME/EXPENSE)
 * @returns {array} Categorias com totais
 */
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

/**
 * Renderiza o gráfico de evolução mensal
 * @param {array} monthlyData - Dados mensais
 */
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

/**
 * Navega para uma seção específica
 * @param {string} section - Nome da seção
 */
function navigateTo(section) {
    const navItem = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (navItem) {
        navItem.click();
    }
}

// Exportar para uso global
window.loadDashboard = loadDashboard;
window.renderEmptyDashboard = renderEmptyDashboard;
window.renderDashboard = renderDashboard;
window.renderAlerts = renderAlerts;
window.getAlertIcon = getAlertIcon;
window.renderTopCategories = renderTopCategories;
window.createMonthlyDataFromEntries = createMonthlyDataFromEntries;
window.calculateCategoriesFromEntries = calculateCategoriesFromEntries;
window.renderChart = renderChart;
window.navigateTo = navigateTo;

