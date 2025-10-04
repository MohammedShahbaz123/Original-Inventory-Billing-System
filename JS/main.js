// =====================
// MAIN APPLICATION - CORE FUNCTIONALITY
// =====================    

// =====================
// KEYBOARD SHORTCUT MANAGER
// =====================
class ShortcutManager {
    constructor() {
        this.shortcuts = new Map();
        this.init();
    }

    init() {
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
    }

    register(keys, action, description) {
        this.shortcuts.set(keys.join('+'), { action, description });
    }

    handleKeyPress(e) {
        const keys = [];
        if (e.altKey) keys.push('Alt');
        if (e.ctrlKey) keys.push('Ctrl');
        if (e.shiftKey) keys.push('Shift');
        keys.push(e.key);

        const shortcutKey = keys.join('+');
        const shortcut = this.shortcuts.get(shortcutKey);

        if (shortcut) {
            e.preventDefault();
            shortcut.action();
        }
    }

    getShortcutsForPage(pageId) {
        const pageShortcuts = {
            'dashboard': [
                { keys: ['Alt', 'S'], description: 'Create Sales Invoice' },
                { keys: ['Alt', 'P'], description: 'Create Purchase Invoice' },
                { keys: ['Alt', 'I'], description: 'View Inventory' },
                { keys: ['Alt', 'L'], description: 'View Sales' },
                { keys: ['Alt', 'U'], description: 'View Purchases' },
                { keys: ['Alt', 'T'], description: 'Party Management' },
                { keys: ['Escape'], description: 'Refresh Dashboard' }
            ],
            'salesInvoice': [
                { keys: ['Alt', 'Enter'], description: 'Save Invoice' },
                { keys: ['Enter'], description: 'Next Field' },
                { keys: ['Escape'], description: 'Back to Dashboard' },
                { keys: ['Alt', 'ArrowLeft'], description: 'Go Back' },
                { keys: ['Alt', 'C'], description: 'Clear Invoice' }
            ],
            'purchaseInvoice': [
                { keys: ['Alt', 'Enter'], description: 'Save Invoice' },
                { keys: ['Enter'], description: 'Next Field' },
                { keys: ['Escape'], description: 'Back to Dashboard' },
                { keys: ['Alt', 'ArrowLeft'], description: 'Go Back' },
                { keys: ['Alt', 'C'], description: 'Clear Invoice' }
            ],
            'inventory': [
                { keys: ['Alt', 'N'], description: 'Add New Item' },
                { keys: ['Escape'], description: 'Back to Dashboard' },
                { keys: ['Alt', 'ArrowLeft'], description: 'Go Back' },
                { keys: ['Alt', 'F'], description: 'Focus Search' },
                { keys: ['Alt', 'E'], description: 'Export Inventory' }
            ],
            'sales': [
                { keys: ['Alt', 'S'], description: 'Create Sales Invoice' },
                { keys: ['Escape'], description: 'Back to Dashboard' },
                { keys: ['Alt', 'ArrowLeft'], description: 'Go Back' },
                { keys: ['Alt', 'F'], description: 'Focus Search' }
            ],
            'purchases': [
                { keys: ['Alt', 'P'], description: 'Create Purchase Invoice' },
                { keys: ['Escape'], description: 'Back to Dashboard' },
                { keys: ['Alt', 'ArrowLeft'], description: 'Go Back' },
                { keys: ['Alt', 'F'], description: 'Focus Search' }
            ],
            'partyManagement': [
                { keys: ['Alt', 'N'], description: 'Create New Party' },
                { keys: ['Enter'], description: 'Save Party' },
                { keys: ['Escape'], description: 'Clear Form' },
                { keys: ['Alt', 'ArrowLeft'], description: 'Go Back' },
                { keys: ['Alt', 'R'], description: 'Refresh Parties' }
            ],
            'invoicePage': [
                { keys: ['Alt', 'Print'], description: 'Print Invoice' },
                { keys: ['Alt', 'D'], description: 'Download PDF' },
                { keys: ['Alt', 'C'], description: 'Copy to Clipboard' },
                { keys: ['Escape'], description: 'Back to Dashboard' },
                { keys: ['Alt', 'ArrowLeft'], description: 'Go Back' }
            ]
        };
        return pageShortcuts[pageId] || [];
    }
}

// Initialize shortcut manager
const shortcutManager = new ShortcutManager();

// =====================
// PAGE MANAGEMENT
// =====================
// Enhanced Page Switching with Shortcut Bar - SINGLE VERSION
function showPage(id) {
    console.log("🎯 showPage called with:", id);
    
    // Get current page before switching
    const currentPage = document.querySelector('.page:not(.hidden)');
    if (currentPage && currentPage.id !== id) {
        if (pageHistory[pageHistory.length - 1] !== currentPage.id) {
            pageHistory.push(currentPage.id);
        }
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.add('hidden');
        console.log("📄 Hiding page:", p.id);
    });
    
    // Show target page
    const page = document.getElementById(id);
    if (!page) {
        console.error('Page not found:', id);
        showPage('dashboard');
        return;
    }
    
    page.classList.remove('hidden');
    console.log("✅ Now showing page:", id);

    // Set active nav item
    setActiveNavItem(id);

    // Add shortcut bar if not already present
    let shortcutBar = page.querySelector('.shortcut-bar');
    if (!shortcutBar) {
        const shortcutBarHTML = createShortcutBar(id);
        if (shortcutBarHTML) {
            page.insertAdjacentHTML('afterbegin', shortcutBarHTML);
        }
    }

    // Focus first field
    const firstInput = page.querySelector('input, select, button');
    if (firstInput) firstInput.focus();

    // Load data based on page
    handlePageSpecificActions(id);
    
    console.log('Navigated to:', id, 'History:', pageHistory);
    
    // Scroll to top
    window.scrollTo(0, 0);
}
// Handle page-specific actions
function handlePageSpecificActions(pageId) {
    switch(pageId) {
        case "salesInvoice":
        case "purchaseInvoice":
            loadItemsDropdown();
            loadParties();
            break;
        case "partyManagement":
            loadParties();
            break;
        case "inventory":
            loadInventory();
            break;
        case "sales":
            loadSales();
            break;
        case "purchases":
            loadPurchases();
            break;
        case "dashboard":
            refreshDashboard();
            break;
    }
}

// Refresh dashboard data
function refreshDashboard() {
    // Update any dynamic content on dashboard
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        const timestamp = dashboard.querySelector('.dashboard-timestamp');
        if (timestamp) {
            timestamp.textContent = `Last updated: ${new Date().toLocaleString()}`;
        }
    }
}

// =====================
// SHORTCUT BAR COMPONENT
// =====================
function createShortcutBar(pageId) {
    const shortcuts = shortcutManager.getShortcutsForPage(pageId);
    
    if (shortcuts.length === 0) return '';

    const shortcutItems = shortcuts.map(shortcut => 
        `<div class="shortcut-item">
            <span class="shortcut-keys">${shortcut.keys.map(key => 
                `<kbd>${key}</kbd>`
            ).join('+')}</span>
            <span class="shortcut-desc">${shortcut.description}</span>
        </div>`
    ).join('');

    return `
        <div class="shortcut-bar" id="shortcutBar">
            <div class="shortcut-bar-header">
                <span>📋 Keyboard Shortcuts</span>
                <button onclick="toggleShortcutBar()" class="shortcut-toggle">−</button>
            </div>
            <div class="shortcut-items">
                ${shortcutItems}
            </div>
        </div>
    `;
}

function toggleShortcutBar() {
    const bar = document.getElementById('shortcutBar');
    if (!bar) return;
    
    const items = bar.querySelector('.shortcut-items');
    const toggleBtn = bar.querySelector('.shortcut-toggle');
    
    if (items.style.display === 'none') {
        items.style.display = 'flex';
        toggleBtn.textContent = '−';
    } else {
        items.style.display = 'none';
        toggleBtn.textContent = '+';
    }
}

// Sidebar functionality
        function toggleSidebar() {
            const sidebar = document.querySelector('.sidebar');
            sidebar.classList.toggle('mobile-open');
        }

        function setActiveNavItem(pageId) {
            // Remove active class from all items
            document.querySelectorAll('.sidebar-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to current item
            const activeItem = document.getElementById(`${pageId}-nav`);
            if (activeItem) {
                activeItem.classList.add('active');
            }
        }

        // Update showPage function to handle active state
        function showPage(id) {
            // Set active nav item
            setActiveNavItem(id);
            
            // Your existing showPage logic here
            console.log('Showing page:', id);
        }

        // Close sidebar on mobile when clicking outside
        document.addEventListener('click', function(e) {
            const sidebar = document.querySelector('.sidebar');
            const menuToggle = document.querySelector('.menu-toggle');
            
            if (window.innerWidth <= 768 && 
                !sidebar.contains(e.target) && 
                !menuToggle.contains(e.target) &&
                sidebar.classList.contains('mobile-open')) {
                sidebar.classList.remove('mobile-open');
            }
        });

        // Initialize dashboard as active
        document.addEventListener('DOMContentLoaded', function() {
            setActiveNavItem('dashboard');
        });

// =====================
// DASHBOARD ENHANCEMENTS
// =====================
function enhanceDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;

    // Add quick action buttons if not present
    if (!dashboard.querySelector('.quick-actions')) {
        const quickActionsHTML = `
            <div class="quick-actions">
                <h3>🚀 Quick Actions</h3>
                <div class="action-buttons">
                    <button onclick="showPage('salesInvoice')" class="action-btn sales-btn">
                        <span class="action-icon">💰</span>
                        <div class="action-content">
                            <div class="action-title">Sales Invoice</div>
                            <div class="action-shortcut">Alt + S</div>
                        </div>
                    </button>
                    <button onclick="showPage('purchaseInvoice')" class="action-btn purchase-btn">
                        <span class="action-icon">🛒</span>
                        <div class="action-content">
                            <div class="action-title">Purchase Invoice</div>
                            <div class="action-shortcut">Alt + P</div>
                        </div>
                    </button>
                    <button onclick="loadInventory()" class="action-btn inventory-btn">
                        <span class="action-icon">📦</span>
                        <div class="action-content">
                            <div class="action-title">Inventory</div>
                            <div class="action-shortcut">Alt + I</div>
                        </div>
                    </button>
                    <button onclick="loadSales()" class="action-btn sales-view-btn">
                        <span class="action-icon">📊</span>
                        <div class="action-content">
                            <div class="action-title">View Sales</div>
                            <div class="action-shortcut">Alt + L</div>
                        </div>
                    </button>
                    <button onclick="loadPurchases()" class="action-btn purchases-view-btn">
                        <span class="action-icon">📋</span>
                        <div class="action-content">
                            <div class="action-title">View Purchases</div>
                            <div class="action-shortcut">Alt + U</div>
                        </div>
                    </button>
                    <button onclick="showPartyManagement()" class="action-btn parties-btn">
                        <span class="action-icon">🏢</span>
                        <div class="action-content">
                            <div class="action-title">Party Management</div>
                            <div class="action-shortcut">Alt + T</div>
                        </div>
                    </button>
                </div>
                <div class="dashboard-timestamp" style="text-align: center; margin-top: 20px; color: #7f8c8d; font-size: 12px;">
                    Last updated: ${new Date().toLocaleString()}
                </div>
            </div>
        `;
        dashboard.insertAdjacentHTML('afterbegin', quickActionsHTML);
    }

    // Add stats overview if not present
    if (!dashboard.querySelector('.dashboard-stats')) {
        const statsHTML = `
            <div class="dashboard-stats">
                <h3>📈 Quick Overview</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">📦</div>
                        <div class="stat-info">
                            <div class="stat-value" id="totalItems">--</div>
                            <div class="stat-label">Total Items</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">💰</div>
                        <div class="stat-info">
                            <div class="stat-value" id="totalSales">--</div>
                            <div class="stat-label">Sales Invoices</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🛒</div>
                        <div class="stat-info">
                            <div class="stat-value" id="totalPurchases">--</div>
                            <div class="stat-label">Purchase Invoices</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🏢</div>
                        <div class="stat-info">
                            <div class="stat-value" id="totalParties">--</div>
                            <div class="stat-label">Parties</div>
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

    // Load dashboard stats
    loadDashboardStats();
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        // You can enhance this to make actual API calls for stats
        // For now, we'll set placeholder values
        document.getElementById('totalItems').textContent = 'Loading...';
        document.getElementById('totalSales').textContent = 'Loading...';
        document.getElementById('totalPurchases').textContent = 'Loading...';
        document.getElementById('totalParties').textContent = 'Loading...';

        // Simulate loading stats
        setTimeout(() => {
            document.getElementById('totalItems').textContent = '25';
            document.getElementById('totalSales').textContent = '15';
            document.getElementById('totalPurchases').textContent = '8';
            document.getElementById('totalParties').textContent = '12';
        }, 1000);

    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        // Set default values on error
        document.getElementById('totalItems').textContent = '--';
        document.getElementById('totalSales').textContent = '--';
        document.getElementById('totalPurchases').textContent = '--';
        document.getElementById('totalParties').textContent = '--';
    }
}

// =====================
// GLOBAL SHORTCUT REGISTRATION
// =====================
function registerGlobalShortcuts() {
    // Navigation shortcuts
    shortcutManager.register(['Alt', 'S'], () => showPage("salesInvoice"), "Sales Invoice");
    shortcutManager.register(['Alt', 'P'], () => showPage("purchaseInvoice"), "Purchase Invoice");
    shortcutManager.register(['Alt', 'I'], () => loadInventory(), "Inventory");
    shortcutManager.register(['Alt', 'L'], () => loadSales(), "Sales");
    shortcutManager.register(['Alt', 'U'], () => loadPurchases(), "Purchases");
    shortcutManager.register(['Alt', 'T'], () => showPartyManagement(), "Party Management");
    shortcutManager.register(['Escape'], () => goToDashboard(), "Dashboard");
    shortcutManager.register(['Alt', 'ArrowLeft'], () => goBackToPreviousPage(), "Go Back");

    // Invoice shortcuts
    shortcutManager.register(['Alt', 'Enter'], () => {
        const salesVisible = !document.getElementById("salesInvoice").classList.contains("hidden");
        const purchaseVisible = !document.getElementById("purchaseInvoice").classList.contains("hidden");
        if (salesVisible) saveSaleInvoice();
        if (purchaseVisible) savePurchaseInvoice();
    }, "Save Invoice");

    // Inventory shortcuts
    shortcutManager.register(['Alt', 'N'], () => {
        if (!document.getElementById("inventory").classList.contains("hidden")) {
            document.getElementById("itemName")?.focus();
        }
    }, "Add New Item");

    shortcutManager.register(['Alt', 'F'], () => {
        const currentPage = document.querySelector('.page:not(.hidden)').id;
        let searchInput = null;
        
        switch(currentPage) {
            case 'inventory':
                searchInput = document.getElementById('inventorySearch');
                break;
            case 'sales':
                searchInput = document.getElementById('salesSearch');
                break;
            case 'purchases':
                searchInput = document.getElementById('purchasesSearch');
                break;
        }
        
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }, "Focus Search");

    // Invoice actions
    shortcutManager.register(['Alt', 'Print'], () => {
        if (!document.getElementById("invoicePage").classList.contains("hidden")) {
            printInvoice();
        }
    }, "Print Invoice");

    shortcutManager.register(['Alt', 'D'], () => {
        if (!document.getElementById("invoicePage").classList.contains("hidden")) {
            downloadInvoicePDF();
        }
    }, "Download PDF");

    shortcutManager.register(['Alt', 'C'], () => {
        const salesVisible = !document.getElementById("salesInvoice").classList.contains("hidden");
        const purchaseVisible = !document.getElementById("purchaseInvoice").classList.contains("hidden");
        const invoiceVisible = !document.getElementById("invoicePage").classList.contains("hidden");
        
        if (salesVisible) clearSaleInvoice();
        if (purchaseVisible) clearPurchaseInvoice();
        if (invoiceVisible) shareInvoice();
    }, "Clear/Share");

    // Party management shortcuts
    shortcutManager.register(['Alt', 'R'], () => {
        if (!document.getElementById("partyManagement").classList.contains("hidden")) {
            refreshParties();
        }
    }, "Refresh Parties");
}

// =====================
// INPUT FIELD ENHANCEMENTS
// =====================
function enhanceInputFields() {
    // Add title attributes with shortcut hints to key inputs
    const enhancedFields = {
        'saleItem': 'Select item (Press Enter for next field)',
        'saleQty': 'Enter quantity (Press Enter for next field)',
        'salePrice': 'Enter price (Press Alt+Enter to save invoice)',
        'purchaseItem': 'Select item (Press Enter for next field)',
        'purchaseQty': 'Enter quantity (Press Enter for next field)',
        'purchasePrice': 'Enter price (Press Alt+Enter to save invoice)',
        'itemName': 'Enter item name (Alt+N to focus here from inventory)',
        'partyName': 'Enter party name (Press Enter to save)',
        'inventorySearch': 'Search inventory (Alt+F to focus here)',
        'salesSearch': 'Search sales (Alt+F to focus here)',
        'purchasesSearch': 'Search purchases (Alt+F to focus here)'
    };
    
    Object.keys(enhancedFields).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.setAttribute('title', enhancedFields[id]);
            
            // Add focus styles dynamically
            element.addEventListener('focus', function() {
                this.style.borderColor = '#3498db';
                this.style.boxShadow = '0 0 0 3px rgba(52, 152, 219, 0.1)';
            });
            
            element.addEventListener('blur', function() {
                this.style.borderColor = '';
                this.style.boxShadow = '';
            });
        }
    });
}

// =====================
// GLOBAL EVENT LISTENERS
// =====================
function setupGlobalEventListeners() {
    // Enter key navigation between form fields
    document.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.altKey && !e.ctrlKey && !e.shiftKey) {
            const formInputs = Array.from(
                document.querySelectorAll("input, select")
            ).filter(el => el.offsetParent !== null && !el.disabled);

            const currentIndex = formInputs.indexOf(document.activeElement);
            if (currentIndex > -1 && currentIndex < formInputs.length - 1) {
                e.preventDefault();
                formInputs[currentIndex + 1].focus();
            }
        }
    });

    // Escape key to go back to dashboard
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            const currentPage = document.querySelector('.page:not(.hidden)').id;
            if (currentPage !== "dashboard") {
                goToDashboard();
            }
        }
    });

    // Global click handler for external clicks
    document.addEventListener('click', function(e) {
        // Close modals when clicking outside
        const modals = document.querySelectorAll('.delete-confirm-modal, .confirmation-modal');
        modals.forEach(modal => {
            if (!modal.contains(e.target) && !e.target.closest('[onclick*="confirm"]')) {
                modal.remove();
            }
        });
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', function(event) {
        goBackToPreviousPage();
    });
}

// =====================
// UTILITY FUNCTIONS
// =====================
function showNotification(message, type = 'info', duration = 5000) {
    // Remove existing notification
    const existingNotification = document.querySelector('.global-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `global-notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span class="notification-message">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="notification-close">×</button>
        </div>
    `;

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }

    return notification;
}

// Global error handler
function handleGlobalError(error, context = 'Application') {
    console.error(`${context} Error:`, error);
    showNotification(`Something went wrong: ${error.message}`, 'error', 8000);
}

// Loading state management
function showGlobalLoading(message = 'Loading...') {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'global-loading';
    loadingOverlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner">🔄</div>
            <div class="loading-text">${message}</div>
        </div>
    `;
    loadingOverlay.id = 'globalLoadingOverlay';
    document.body.appendChild(loadingOverlay);
    
    setTimeout(() => {
        loadingOverlay.classList.add('show');
    }, 100);
}

function hideGlobalLoading() {
    const loadingOverlay = document.getElementById('globalLoadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('show');
        setTimeout(() => {
            if (loadingOverlay.parentElement) {
                loadingOverlay.remove();
            }
        }, 300);
    }
}

// =====================
// STYLES MANAGEMENT
// =====================
function addShortcutBarStyles() {
    const styles = `
        .shortcut-bar {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 20px;
            margin: -20px -20px 20px -20px;
            border-radius: 0 0 10px 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .shortcut-bar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            font-weight: bold;
            font-size: 14px;
        }
        
        .shortcut-toggle {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        
        .shortcut-toggle:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .shortcut-items {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            font-size: 12px;
            transition: all 0.3s ease;
        }
        
        .shortcut-item {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(255,255,255,0.1);
            padding: 6px 12px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        
        .shortcut-keys {
            display: flex;
            gap: 2px;
        }
        
        kbd {
            background: rgba(255,255,255,0.9);
            color: #333;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            border: 1px solid rgba(255,255,255,0.3);
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        
        .quick-actions {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            border: 1px solid #e0e6ed;
        }
        
        .quick-actions h3 {
            margin: 0 0 20px 0;
            color: #2c3e50;
            font-size: 1.4em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .action-buttons {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 15px;
        }
        
        .action-btn {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 20px;
            border: none;
            border-radius: 12px;
            background: white;
            color: #2c3e50;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border: 2px solid transparent;
            text-align: left;
            width: 100%;
        }
        
        .action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        }
        
        .action-icon {
            font-size: 24px;
            width: 40px;
            text-align: center;
        }
        
        .action-content {
            flex: 1;
        }
        
        .action-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 4px;
        }
        
        .action-shortcut {
            font-size: 12px;
            color: #7f8c8d;
            font-family: monospace;
        }
        
        .sales-btn { border-left: 4px solid #e74c3c; }
        .purchase-btn { border-left: 4px solid #3498db; }
        .inventory-btn { border-left: 4px solid #27ae60; }
        .sales-view-btn { border-left: 4px solid #9b59b6; }
        .purchases-view-btn { border-left: 4px solid #f39c12; }
        .parties-btn { border-left: 4px solid #34495e; }
        
        .sales-btn:hover { background: #ffeaea; }
        .purchase-btn:hover { background: #e8f4fd; }
        .inventory-btn:hover { background: #eafaf1; }
        .sales-view-btn:hover { background: #f4eef8; }
        .purchases-view-btn:hover { background: #fef9e7; }
        .parties-btn:hover { background: #f8f9fa; }
        
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
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .stat-card {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 4px solid #3498db;
            transition: all 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .stat-icon {
            font-size: 24px;
            width: 40px;
            text-align: center;
        }
        
        .stat-info {
            flex: 1;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 4px;
        }
        
        .stat-label {
            font-size: 12px;
            color: #7f8c8d;
            text-transform: uppercase;
            font-weight: 600;
        }
        
        .global-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 10000;
            transform: translateX(400px);
            opacity: 0;
            transition: all 0.3s ease;
            max-width: 400px;
        }
        
        .global-notification.show {
            transform: translateX(0);
            opacity: 1;
        }
        
        .notification-success {
            border-left: 4px solid #27ae60;
        }
        
        .notification-error {
            border-left: 4px solid #e74c3c;
        }
        
        .notification-warning {
            border-left: 4px solid #f39c12;
        }
        
        .notification-info {
            border-left: 4px solid #3498db;
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 15px 20px;
        }
        
        .notification-close {
            background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
            color: #7f8c8d;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .notification-close:hover {
            color: #e74c3c;
        }
        
        .global-loading {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .global-loading.show {
            opacity: 1;
        }
        
        .loading-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        
        .loading-spinner {
            font-size: 40px;
            margin-bottom: 15px;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
            .shortcut-items {
                flex-direction: column;
                gap: 8px;
            }
            
            .action-buttons {
                grid-template-columns: 1fr;
            }
            
            .action-btn {
                padding: 15px;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .global-notification {
                left: 20px;
                right: 20px;
                max-width: none;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// =====================
// APPLICATION INITIALIZATION
// =====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Business Management System...');
    
    // Initialize core components
    registerGlobalShortcuts();
    setupGlobalEventListeners();
    enhanceDashboard();
    addShortcutBarStyles();
    
    // Enhance input fields after a short delay
    setTimeout(enhanceInputFields, 1000);
    
    // Show welcome message
    setTimeout(() => {
        showNotification('Business Management System Ready! Use keyboard shortcuts for faster navigation.', 'success', 4000);
    }, 1500);
    
    console.log('✅ Application initialized successfully');
});

// Global error handling
window.addEventListener('error', function(e) {
    handleGlobalError(e.error, 'Global');
});

window.addEventListener('unhandledrejection', function(e) {
    handleGlobalError(e.reason, 'Promise');
});