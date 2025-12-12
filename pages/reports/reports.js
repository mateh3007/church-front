// ==========================================
// Relatórios Financeiros
// ==========================================

// Estado local do módulo
let currentReportTab = 'comparison';

/**
 * Carrega a página de relatórios
 * @param {HTMLElement} container - Container onde o conteúdo será renderizado
 */
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

/**
 * Troca a tab ativa do relatório
 * @param {string} tab - Nome da tab
 */
async function switchReportTab(tab) {
    currentReportTab = tab;
    
    // Atualizar tabs ativas
    document.querySelectorAll('.report-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    
    await loadReportTab(tab);
}

/**
 * Carrega o conteúdo de uma tab específica
 * @param {string} tab - Nome da tab
 */
async function loadReportTab(tab) {
    const container = document.getElementById('report-content');
    container.innerHTML = `
        <div class="dashboard-loading">
            <div class="spinner"></div>
            <p>Carregando relatório...</p>
        </div>
    `;
    
    const churchId = AppState.church?.id;
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

/**
 * Carrega o relatório comparativo
 */
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

/**
 * Carrega o relatório por ministério
 */
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

/**
 * Carrega o relatório de projeção
 */
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

/**
 * Carrega o relatório de resumo geral
 */
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

/**
 * Renderiza o resumo de categorias
 * @param {array} categories - Lista de categorias
 * @param {string} type - Tipo (income/expense)
 * @returns {string} HTML das categorias
 */
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

/**
 * Retorna o ícone para um tipo de mensagem
 * @param {string} type - Tipo da mensagem
 * @returns {string} Classe do ícone
 */
function getMessageIcon(type) {
    const icons = {
        SUCCESS: 'fa-check-circle',
        WARNING: 'fa-exclamation-triangle',
        DANGER: 'fa-times-circle',
        INFO: 'fa-info-circle'
    };
    return icons[type] || icons[type?.toUpperCase()] || 'fa-info-circle';
}

// Exportar para uso global
window.loadReports = loadReports;
window.switchReportTab = switchReportTab;
window.loadReportTab = loadReportTab;
window.loadComparisonReport = loadComparisonReport;
window.loadMinistriesReport = loadMinistriesReport;
window.loadProjectionReport = loadProjectionReport;
window.loadSummaryReport = loadSummaryReport;
window.renderCategorySummary = renderCategorySummary;
window.getMessageIcon = getMessageIcon;

