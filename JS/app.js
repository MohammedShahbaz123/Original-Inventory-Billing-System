// Main application initialization
class App {
    static init() {
        console.log('Initializing Business Management System...');
        
        // Set current date for date inputs
        this.setDefaultDates();
        
        // Initialize event listeners
        this.initializeEventListeners();
        
        // Load initial data
        this.loadInitialData();
        
        // Show dashboard by default
        Navigation.showPage('dashboard');
        
        console.log('Business Management System initialized successfully');
    }

    static setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        document.querySelectorAll('input[type="date"]').forEach(input => {
            if (!input.value) {
                input.value = today;
            }
        });
    }

    static initializeEventListeners() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        // Form submissions are handled in individual files
        console.log('Event listeners initialized');
    }

    static handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + K for search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            const activePage = Navigation.currentPage;
            this.focusSearchField(activePage);
        }
        
        // Escape key to go back
        if (event.key === 'Escape') {
            Navigation.goBackToPreviousPage();
        }
    }

    static focusSearchField(activePage) {
        const searchMap = {
            'party-management': 'partiesSearch',
            'inventory': 'inventorySearch',
            'sales': 'salesSearch',
            'purchases': 'purchasesSearch'
        };
        
        const searchId = searchMap[activePage];
        if (searchId) {
            const searchInput = document.getElementById(searchId);
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    }

    static async loadInitialData() {
        try {
            // Preload essential data in background
            await Promise.all([
                SupabaseService.getParties(),
                SupabaseService.getItems(),
                SupabaseService.getSales(),
                SupabaseService.getPurchases()
            ]);
            
            console.log('Initial data loaded successfully');
        } catch (error) {
            console.warn('Some initial data failed to load:', error);
        }
    }

    // Utility method to refresh all data
    static async refreshAllData() {
        try {
            Utils.showNotification('Refreshing all data...', 'info');
            
            await Promise.all([
                loadParties(),
                loadInventory(),
                loadSales(),
                loadPurchases()
            ]);
            
            if (Navigation.currentPage === 'dashboard') {
                Dashboard.loadDashboardData();
            }
            
            Utils.showNotification('All data refreshed successfully', 'success');
        } catch (error) {
            console.error('Error refreshing data:', error);
            Utils.showNotification('Error refreshing data', 'error');
        }
    }
}

// Global functions for HTML onclick handlers
function showPage(pageId) {
    Navigation.showPage(pageId);
}

function goBack() {
    Navigation.goBackToPreviousPage();
}

function showPartyManagement() {
    Navigation.showPage('party-management');
}

// Initialize app when DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}

// Export for global access
window.App = App;
window.Navigation = Navigation;
window.Utils = Utils;