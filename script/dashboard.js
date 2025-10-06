// Dashboard functionality
class Dashboard {
    static async loadDashboardData() {
        try {
            const data = await SupabaseService.getDashboardData();
            this.displayDashboard(data);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.displayError();
        }
    }

    static displayDashboard(data) {
        const dashboard = document.getElementById('dashboard');
        if (!dashboard) return;

        const { items, parties, sales, purchases } = data;
        
        const totalSales = sales.reduce((sum, sale) => {
            const saleTotal = sale.sale_items?.reduce((itemSum, item) => 
                itemSum + (item.quantity * item.price), 0) || 0;
            return sum + saleTotal;
        }, 0);

        const totalPurchases = purchases.reduce((sum, purchase) => {
            const purchaseTotal = purchase.purchase_items?.reduce((itemSum, item) => 
                itemSum + (item.quantity * item.price), 0) || 0;
            return sum + purchaseTotal;
        }, 0);

        const totalInventoryValue = items.reduce((sum, item) => 
            sum + (item.price * item.stock), 0);

        const lowStockItems = items.filter(item => item.stock > 0 && item.stock <= 10).length;
        const outOfStockItems = items.filter(item => item.stock === 0).length;

        dashboard.innerHTML = `
            <div class="dashboard-header">
                <h1>Dashboard Overview</h1>
                <p>Welcome to your business management system</p>
            </div>

            <div class="stats-grid">
                <div class="stat-card revenue">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value">${Utils.formatCurrency(totalSales)}</div>
                        <div class="stat-label">Total Sales</div>
                        <div class="stat-subtext">${sales.length} invoices</div>
                    </div>
                </div>

                <div class="stat-card expenses">
                    <div class="stat-icon">🛒</div>
                    <div class="stat-content">
                        <div class="stat-value">${Utils.formatCurrency(totalPurchases)}</div>
                        <div class="stat-label">Total Purchases</div>
                        <div class="stat-subtext">${purchases.length} invoices</div>
                    </div>
                </div>

                <div class="stat-card inventory">
                    <div class="stat-icon">📦</div>
                    <div class="stat-content">
                        <div class="stat-value">${Utils.formatCurrency(totalInventoryValue)}</div>
                        <div class="stat-label">Inventory Value</div>
                        <div class="stat-subtext">${items.length} items</div>
                    </div>
                </div>

                <div class="stat-card parties">
                    <div class="stat-icon">👥</div>
                    <div class="stat-content">
                        <div class="stat-value">${parties.length}</div>
                        <div class="stat-label">Total Parties</div>
                        <div class="stat-subtext">
                            ${parties.filter(p => p.type === 'customer' || p.type === 'both').length} customers
                        </div>
                    </div>
                </div>
            </div>

            <div class="dashboard-content">
                <div class="content-grid">
                    <div class="content-card">
                        <div class="card-header">
                            <h3>📊 Quick Actions</h3>
                        </div>
                        <div class="quick-actions">
                            <button onclick="showPage('salesInvoice')" class="quick-action-btn">
                                <span class="action-icon">💰</span>
                                <span class="action-text">Create Sale</span>
                            </button>
                            <button onclick="showPage('purchaseInvoice')" class="quick-action-btn">
                                <span class="action-icon">🛒</span>
                                <span class="action-text">Create Purchase</span>
                            </button>
                            <button onclick="showPage('createItem')" class="quick-action-btn">
                                <span class="action-icon">📦</span>
                                <span class="action-text">Add Item</span>
                            </button>
                            <button onclick="showPage('createParty')" class="quick-action-btn">
                                <span class="action-icon">👥</span>
                                <span class="action-text">Add Party</span>
                            </button>
                        </div>
                    </div>

                    <div class="content-card">
                        <div class="card-header">
                            <h3>⚠️ Stock Alerts</h3>
                        </div>
                        <div class="alerts-list">
                            ${outOfStockItems > 0 ? `
                                <div class="alert-item critical">
                                    <span class="alert-icon">🚨</span>
                                    <div class="alert-content">
                                        <div class="alert-title">Out of Stock</div>
                                        <div class="alert-description">${outOfStockItems} items need restocking</div>
                                    </div>
                                    <button onclick="showPage('inventory')" class="alert-action">View</button>
                                </div>
                            ` : ''}
                            
                            ${lowStockItems > 0 ? `
                                <div class="alert-item warning">
                                    <span class="alert-icon">⚠️</span>
                                    <div class="alert-content">
                                        <div class="alert-title">Low Stock</div>
                                        <div class="alert-description">${lowStockItems} items running low</div>
                                    </div>
                                    <button onclick="showPage('inventory')" class="alert-action">View</button>
                                </div>
                            ` : ''}
                            
                            ${outOfStockItems === 0 && lowStockItems === 0 ? `
                                <div class="no-alerts">
                                    <span class="no-alerts-icon">✅</span>
                                    <div class="no-alerts-text">All items are well stocked</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="content-card">
                        <div class="card-header">
                            <h3>📈 Recent Sales</h3>
                        </div>
                        <div class="recent-list">
                            ${sales.slice(0, 5).map(sale => {
                                const total = sale.sale_items?.reduce((sum, item) => 
                                    sum + (item.quantity * item.price), 0) || 0;
                                return `
                                    <div class="recent-item">
                                        <div class="recent-info">
                                            <div class="recent-title">${sale.parties?.name || 'Unknown'}</div>
                                            <div class="recent-date">${Utils.formatDate(sale.invoice_date)}</div>
                                        </div>
                                        <div class="recent-amount">${Utils.formatCurrency(total)}</div>
                                    </div>
                                `;
                            }).join('') || '<div class="no-data">No recent sales</div>'}
                        </div>
                    </div>

                    <div class="content-card">
                        <div class="card-header">
                            <h3>🛒 Recent Purchases</h3>
                        </div>
                        <div class="recent-list">
                            ${purchases.slice(0, 5).map(purchase => {
                                const total = purchase.purchase_items?.reduce((sum, item) => 
                                    sum + (item.quantity * item.price), 0) || 0;
                                return `
                                    <div class="recent-item">
                                        <div class="recent-info">
                                            <div class="recent-title">${purchase.parties?.name || 'Unknown'}</div>
                                            <div class="recent-date">${Utils.formatDate(purchase.invoice_date)}</div>
                                        </div>
                                        <div class="recent-amount">${Utils.formatCurrency(total)}</div>
                                    </div>
                                `;
                            }).join('') || '<div class="no-data">No recent purchases</div>'}
                        </div>
                    </div>
                </div>
            </div>

            <footer class="footer">
                <div class="footer-content">
                    <p>&copy; 2024 Business Management System. All rights reserved.</p>
                    <div class="footer-links">
                        <span>📊 Version 1.0</span>
                        <span>🕒 Last updated: ${new Date().toLocaleDateString()}</span>
                    </div>
                </div>
            </footer>
        `;

        // Add dashboard styles
        this.addDashboardStyles();
    }

    static addDashboardStyles() {
        if (document.querySelector('#dashboard-styles')) return;

        const styles = `
            <style id="dashboard-styles">
                .dashboard-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                
                .dashboard-header h1 {
                    color: #2c3e50;
                    margin-bottom: 0.5rem;
                }
                
                .dashboard-header p {
                    color: #7f8c8d;
                    font-size: 1.1rem;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }
                
                .stat-card {
                    background: white;
                    padding: 1.5rem;
                    border-radius: 12px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    border-left: 4px solid #3498db;
                }
                
                .stat-card.revenue { border-left-color: #27ae60; }
                .stat-card.expenses { border-left-color: #e74c3c; }
                .stat-card.inventory { border-left-color: #f39c12; }
                .stat-card.parties { border-left-color: #9b59b6; }
                
                .stat-icon {
                    font-size: 2.5rem;
                    opacity: 0.8;
                }
                
                .stat-value {
                    font-size: 1.8rem;
                    font-weight: bold;
                    color: #2c3e50;
                }
                
                .stat-label {
                    font-size: 0.9rem;
                    color: #7f8c8d;
                    margin-bottom: 0.25rem;
                }
                
                .stat-subtext {
                    font-size: 0.8rem;
                    color: #bdc3c7;
                }
                
                .dashboard-content {
                    margin-bottom: 2rem;
                }
                
                .content-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 1.5rem;
                }
                
                .content-card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                
                .card-header {
                    padding: 1.25rem;
                    border-bottom: 1px solid #ecf0f1;
                    background: #f8f9fa;
                }
                
                .card-header h3 {
                    margin: 0;
                    color: #2c3e50;
                    font-size: 1.1rem;
                }
                
                .quick-actions {
                    padding: 1.25rem;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }
                
                .quick-action-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 1rem;
                    background: #f8f9fa;
                    border: 2px dashed #bdc3c7;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .quick-action-btn:hover {
                    background: #3498db;
                    color: white;
                    border-color: #3498db;
                }
                
                .action-icon {
                    font-size: 1.5rem;
                }
                
                .action-text {
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                
                .alerts-list, .recent-list {
                    padding: 1.25rem;
                }
                
                .alert-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    border-radius: 8px;
                    margin-bottom: 0.75rem;
                }
                
                .alert-item.critical {
                    background: #ffeaea;
                    border-left: 4px solid #e74c3c;
                }
                
                .alert-item.warning {
                    background: #fff4e6;
                    border-left: 4px solid #f39c12;
                }
                
                .alert-icon {
                    font-size: 1.25rem;
                }
                
                .alert-content {
                    flex: 1;
                }
                
                .alert-title {
                    font-weight: bold;
                    color: #2c3e50;
                }
                
                .alert-description {
                    font-size: 0.9rem;
                    color: #7f8c8d;
                }
                
                .alert-action {
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.8rem;
                }
                
                .no-alerts {
                    text-align: center;
                    padding: 2rem;
                    color: #7f8c8d;
                }
                
                .no-alerts-icon {
                    font-size: 2rem;
                    display: block;
                    margin-bottom: 0.5rem;
                }
                
                .recent-item {
                    display: flex;
                    justify-content: between;
                    align-items: center;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid #ecf0f1;
                }
                
                .recent-item:last-child {
                    border-bottom: none;
                }
                
                .recent-info {
                    flex: 1;
                }
                
                .recent-title {
                    font-weight: 500;
                    color: #2c3e50;
                }
                
                .recent-date {
                    font-size: 0.8rem;
                    color: #7f8c8d;
                }
                
                .recent-amount {
                    font-weight: bold;
                    color: #27ae60;
                }
                
                .no-data {
                    text-align: center;
                    padding: 2rem;
                    color: #7f8c8d;
                    font-style: italic;
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    static displayError() {
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            dashboard.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h2>Unable to Load Dashboard</h2>
                    <p>There was an error loading the dashboard data. Please check your connection and try again.</p>
                    <button onclick="Dashboard.loadDashboardData()" class="retry-btn">🔄 Retry</button>
                </div>
            `;
        }
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('dashboard') && !document.getElementById('dashboard').classList.contains('hidden')) {
        Dashboard.loadDashboardData();
    }
});