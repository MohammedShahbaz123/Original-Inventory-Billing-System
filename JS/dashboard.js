// =====================
// Dashboard Module
// =====================

// =====================
// Dashboard Initialization
// =====================
function initializeDashboard() {
    enhanceDashboard();
    loadDashboardStats();
    registerDashboardShortcuts();
    setupDashboardEvents();
}

// =====================
// Dashboard Enhancement
// =====================
function enhanceDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        // Add quick action buttons if not present
        if (!dashboard.querySelector('.quick-actions')) {
            const quickActionsHTML = `
                <div class="quick-actions">
                    <h3>🚀 Quick Actions</h3>
                    <div class="action-buttons">
                        <button onclick="showPage('salesInvoice')" class="action-btn sales-btn">
                            <span class="action-icon">💰</span>
                            <span>Sales Invoice (Alt+S)</span>
                        </button>
                        <button onclick="showPage('purchaseInvoice')" class="action-btn purchase-btn">
                            <span class="action-icon">🛒</span>
                            <span>Purchase Invoice (Alt+P)</span>
                        </button>
                        <button onclick="loadInventory()" class="action-btn inventory-btn">
                            <span class="action-icon">📦</span>
                            <span>Inventory (Alt+I)</span>
                        </button>
                        <button onclick="loadSales()" class="action-btn sales-view-btn">
                            <span class="action-icon">📊</span>
                            <span>View Sales (Alt+L)</span>
                        </button>
                        <button onclick="loadPurchases()" class="action-btn purchases-view-btn">
                            <span class="action-icon">📋</span>
                            <span>View Purchases (Alt+U)</span>
                        </button>
                        <button onclick="showPartyManagement()" class="action-btn party-btn">
                            <span class="action-icon">👥</span>
                            <span>Party Management (Alt+T)</span>
                        </button>
                    </div>
                </div>
            `;
            dashboard.insertAdjacentHTML('afterbegin', quickActionsHTML);
        }

        // Add stats dashboard if not present
        if (!dashboard.querySelector('.dashboard-stats')) {
            const statsHTML = `
                <div class="dashboard-stats">
                    <h3>📈 Quick Stats</h3>
                    <div class="stats-grid" id="statsGrid">
                        <div class="stat-card loading">
                            <div class="stat-icon">📊</div>
                            <div class="stat-info">
                                <div class="stat-value">Loading...</div>
                                <div class="stat-label">Total Sales</div>
                            </div>
                        </div>
                        <div class="stat-card loading">
                            <div class="stat-icon">🛒</div>
                            <div class="stat-info">
                                <div class="stat-value">Loading...</div>
                                <div class="stat-label">Total Purchases</div>
                            </div>
                        </div>
                        <div class="stat-card loading">
                            <div class="stat-icon">📦</div>
                            <div class="stat-info">
                                <div class="stat-value">Loading...</div>
                                <div class="stat-label">Inventory Items</div>
                            </div>
                        </div>
                        <div class="stat-card loading">
                            <div class="stat-icon">👥</div>
                            <div class="stat-info">
                                <div class="stat-value">Loading...</div>
                                <div class="stat-label">Total Parties</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            const quickActions = dashboard.querySelector('.quick-actions');
            if (quickActions) {
                quickActions.insertAdjacentHTML('afterend', statsHTML);
            }
        }
    }
}

// =====================
// Dashboard Statistics
// =====================
async function loadDashboardStats() {
    try {
        const [salesData, purchasesData, inventoryData, partiesData] = await Promise.allSettled([
            UniversalCORSHandler.callAPI('getSales'),
            UniversalCORSHandler.callAPI('getPurchases'),
            UniversalCORSHandler.callAPI('getInventory'),
            UniversalCORSHandler.callAPI('getParties')
        ]);

        updateDashboardStats({
            sales: salesData.status === 'fulfilled' ? salesData.value : null,
            purchases: purchasesData.status === 'fulfilled' ? purchasesData.value : null,
            inventory: inventoryData.status === 'fulfilled' ? inventoryData.value : null,
            parties: partiesData.status === 'fulfilled' ? partiesData.value : null
        });

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showDashboardStatsError();
    }
}

function updateDashboardStats(data) {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;

    // Calculate totals
    const totalSales = calculateTotalSales(data.sales);
    const totalPurchases = calculateTotalPurchases(data.purchases);
    const totalItems = calculateTotalItems(data.inventory);
    const totalParties = calculateTotalParties(data.parties);

    statsGrid.innerHTML = `
        <div class="stat-card sales-stat">
            <div class="stat-icon">💰</div>
            <div class="stat-info">
                <div class="stat-value">₹${totalSales.toLocaleString('en-IN')}</div>
                <div class="stat-label">Total Sales</div>
            </div>
            <div class="stat-trend">📈</div>
        </div>
        <div class="stat-card purchases-stat">
            <div class="stat-icon">🛒</div>
            <div class="stat-info">
                <div class="stat-value">₹${totalPurchases.toLocaleString('en-IN')}</div>
                <div class="stat-label">Total Purchases</div>
            </div>
            <div class="stat-trend">📊</div>
        </div>
        <div class="stat-card inventory-stat">
            <div class="stat-icon">📦</div>
            <div class="stat-info">
                <div class="stat-value">${totalItems}</div>
                <div class="stat-label">Inventory Items</div>
            </div>
            <div class="stat-trend">📋</div>
        </div>
        <div class="stat-card parties-stat">
            <div class="stat-icon">👥</div>
            <div class="stat-info">
                <div class="stat-value">${totalParties}</div>
                <div class="stat-label">Total Parties</div>
            </div>
            <div class="stat-trend">🔗</div>
        </div>
    `;
}

function calculateTotalSales(salesData) {
    if (!salesData || !salesData.data) return 0;
    
    let total = 0;
    const rows = Array.isArray(salesData.data) ? salesData.data.slice(1) : [];
    
    rows.forEach(row => {
        if (row.length >= 7) {
            const totalStr = row[6];
            total += Number(totalStr) || 0;
        }
    });
    
    return total;
}

function calculateTotalPurchases(purchasesData) {
    if (!purchasesData || !purchasesData.data) return 0;
    
    let total = 0;
    const rows = Array.isArray(purchasesData.data) ? purchasesData.data.slice(1) : [];
    
    rows.forEach(row => {
        if (row.length >= 7) {
            const totalStr = row[6];
            total += Number(totalStr) || 0;
        }
    });
    
    return total;
}

function calculateTotalItems(inventoryData) {
    if (!inventoryData || !inventoryData.data) return 0;
    
    const rows = Array.isArray(inventoryData.data) ? inventoryData.data.slice(1) : [];
    return rows.length;
}

function calculateTotalParties(partiesData) {
    if (!partiesData || !partiesData.parties) return 0;
    return partiesData.parties.length;
}

function showDashboardStatsError() {
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
        statsGrid.innerHTML = `
            <div class="stat-card error">
                <div class="stat-icon">⚠️</div>
                <div class="stat-info">
                    <div class="stat-value">Error</div>
                    <div class="stat-label">Failed to load stats</div>
                </div>
            </div>
            <div class="stat-card error">
                <div class="stat-icon">⚠️</div>
                <div class="stat-info">
                    <div class="stat-value">Error</div>
                    <div class="stat-label">Failed to load stats</div>
                </div>
            </div>
            <div class="stat-card error">
                <div class="stat-icon">⚠️</div>
                <div class="stat-info">
                    <div class="stat-value">Error</div>
                    <div class="stat-label">Failed to load stats</div>
                </div>
            </div>
            <div class="stat-card error">
                <div class="stat-icon">⚠️</div>
                <div class="stat-info">
                    <div class="stat-value">Error</div>
                    <div class="stat-label">Failed to load stats</div>
                </div>
            </div>
        `;
    }
}

// =====================
// Dashboard Navigation
// =====================
function goToDashboard() {
    window.pageHistory = [];
    Navigation.showPage('dashboard');
    loadDashboardStats();
}

// =====================
// Dashboard Shortcuts
// =====================
function registerDashboardShortcuts() {
    // Navigation shortcuts
    shortcutManager.register(['Alt', 'S'], () => showPage("salesInvoice"), "Sales Invoice");
    shortcutManager.register(['Alt', 'P'], () => showPage("purchaseInvoice"), "Purchase Invoice");
    shortcutManager.register(['Alt', 'I'], () => loadInventory(), "Inventory");
    shortcutManager.register(['Alt', 'L'], () => loadSales(), "Sales");
    shortcutManager.register(['Alt', 'U'], () => loadPurchases(), "Purchases");
    shortcutManager.register(['Alt', 'T'], () => showPartyManagement(), "Party Management");
    shortcutManager.register(['Escape'], () => goToDashboard(), "Dashboard");
    shortcutManager.register(['Alt', 'ArrowLeft'], () => goBackToPreviousPage(), "Go Back");
}

// =====================
// Dashboard Events
// =====================
function setupDashboardEvents() {
    // Refresh stats button
    document.addEventListener('click', function(e) {
        if (e.target.closest('.refresh-stats')) {
            loadDashboardStats();
        }
    });

    // Auto-refresh stats every 5 minutes
    setInterval(() => {
        if (!document.getElementById('dashboard').classList.contains('hidden')) {
            loadDashboardStats();
        }
    }, 300000); // 5 minutes
}

// =====================
// Dashboard Styles
// =====================
function addDashboardStyles() {
    const styles = `
        .dashboard-stats {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            border: 1px solid #e0e6ed;
        }
        
        .dashboard-stats h3 {
            margin: 0 0 20px 0;
            color: #2c3e50;
            font-size: 1.4em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        
        .stat-card {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 20px;
            border-radius: 12px;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            border-left: 4px solid #3498db;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .stat-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        
        .stat-card.sales-stat { border-left-color: #e74c3c; }
        .stat-card.purchases-stat { border-left-color: #3498db; }
        .stat-card.inventory-stat { border-left-color: #27ae60; }
        .stat-card.parties-stat { border-left-color: #9b59b6; }
        .stat-card.error { border-left-color: #e67e22; }
        
        .stat-icon {
            font-size: 32px;
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(52, 152, 219, 0.1);
            border-radius: 12px;
        }
        
        .sales-stat .stat-icon { background: rgba(231, 76, 60, 0.1); }
        .purchases-stat .stat-icon { background: rgba(52, 152, 219, 0.1); }
        .inventory-stat .stat-icon { background: rgba(39, 174, 96, 0.1); }
        .parties-stat .stat-icon { background: rgba(155, 89, 182, 0.1); }
        .error .stat-icon { background: rgba(230, 126, 34, 0.1); }
        
        .stat-info {
            flex: 1;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 14px;
            color: #7f8c8d;
            font-weight: 500;
        }
        
        .stat-trend {
            font-size: 20px;
            opacity: 0.7;
        }
        
        .stat-card.loading {
            animation: pulse 1.5s infinite;
        }
        
        .stat-card.loading .stat-value,
        .stat-card.loading .stat-label {
            background: #ecf0f1;
            color: transparent;
            border-radius: 4px;
        }
        
        .stat-card.loading .stat-value {
            width: 100px;
            height: 24px;
        }
        
        .stat-card.loading .stat-label {
            width: 80px;
            height: 14px;
        }
        
        .party-btn {
            border-left: 4px solid #9b59b6 !important;
        }
        
        .party-btn:hover {
            background: #f4eef8 !important;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
        
        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .stat-card {
                padding: 15px;
            }
            
            .stat-icon {
                width: 50px;
                height: 50px;
                font-size: 24px;
            }
            
            .stat-value {
                font-size: 20px;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// =====================
// Dashboard Initialization
// =====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initializeDashboard();
        addDashboardStyles();
    });
} else {
    initializeDashboard();
    addDashboardStyles();
}