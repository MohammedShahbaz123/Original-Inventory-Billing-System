// Utility functions
class Utils {
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    }

    static formatDate(date) {
        return new Date(date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static formatDateTime(date) {
        return new Date(date).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    static showNotification(message, type = 'info') {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;

        // Add styles if not already added
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    border-radius: 6px;
                    color: white;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    max-width: 400px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .notification-info { background: #2196F3; }
                .notification-success { background: #4CAF50; }
                .notification-warning { background: #FF9800; }
                .notification-error { background: #f44336; }
                .notification button {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    static showLoading(element) {
        const spinner = element.querySelector('.loading-spinner') || element;
        const originalText = element.querySelector('span') ? element.querySelector('span').textContent : element.textContent;
        
        element.setAttribute('data-original-text', originalText);
        element.disabled = true;
        
        if (element.querySelector('.loading-spinner')) {
            element.querySelector('span').style.display = 'none';
            element.querySelector('.loading-spinner').style.display = 'inline-block';
        } else {
            element.innerHTML = '<div class="loading-spinner"></div>';
        }
    }

    static hideLoading(element) {
        const originalText = element.getAttribute('data-original-text');
        element.disabled = false;
        
        if (element.querySelector('.loading-spinner')) {
            element.querySelector('.loading-spinner').style.display = 'none';
            const span = element.querySelector('span');
            if (span) {
                span.style.display = 'inline';
            }
        } else {
            element.textContent = originalText;
        }
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validatePhone(phone) {
        const re = /^[\d\s+\-()]{10,15}$/;
        return re.test(phone);
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Navigation class
class Navigation {
    static currentPage = 'dashboard';
    static previousPage = 'dashboard';
    static pageHistory = ['dashboard'];

    static showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });

        // Show target page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            this.previousPage = this.currentPage;
            this.currentPage = pageId;
            this.pageHistory.push(pageId);
            
            // Update active nav item
            this.updateActiveNav(pageId);
            
            // Load page-specific data
            this.loadPageData(pageId);
        }
    }

    static goBackToPreviousPage() {
        if (this.pageHistory.length > 1) {
            this.pageHistory.pop(); // Remove current page
            const previousPage = this.pageHistory[this.pageHistory.length - 1];
            this.showPage(previousPage);
        } else {
            this.showPage('dashboard');
        }
    }

    static goToDashboard() {
        this.showPage('dashboard');
    }

    static updateActiveNav(pageId) {
        // Remove active class from all nav items
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to current nav item
        const navMap = {
            'dashboard': 'dashboard-nav',
            'party-management': 'parties-nav',
            'inventory': 'inventory-nav',
            'sales': 'sales-nav',
            'purchases': 'purchase-nav'
        };

        const navItemId = navMap[pageId];
        if (navItemId) {
            const navItem = document.getElementById(navItemId)?.closest('.sidebar-item');
            if (navItem) {
                navItem.classList.add('active');
            }
        }
    }

    static loadPageData(pageId) {
        switch(pageId) {
            case 'dashboard':
                if (typeof Dashboard !== 'undefined') Dashboard.loadDashboardData();
                break;
            case 'party-management':
                if (typeof loadParties !== 'undefined') loadParties();
                break;
            case 'inventory':
                if (typeof loadInventory !== 'undefined') loadInventory();
                break;
            case 'sales':
                if (typeof loadSales !== 'undefined') loadSales();
                break;
            case 'purchases':
                if (typeof loadPurchases !== 'undefined') loadPurchases();
                break;
            case 'salesInvoice':
                if (typeof initSalesInvoice !== 'undefined') initSalesInvoice();
                break;
            case 'purchaseInvoice':
                if (typeof initPurchaseInvoice !== 'undefined') initPurchaseInvoice();
                break;
        }
    }
}

// Date range utilities
class DateRangeUtils {
    static getDateRange(range) {
        const now = new Date();
        const start = new Date();
        const end = new Date();

        switch(range) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'yesterday':
                start.setDate(now.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                end.setDate(now.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                break;
            case 'thisWeek':
                start.setDate(now.getDate() - now.getDay());
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'lastWeek':
                start.setDate(now.getDate() - now.getDay() - 7);
                start.setHours(0, 0, 0, 0);
                end.setDate(now.getDate() - now.getDay() - 1);
                end.setHours(23, 59, 59, 999);
                break;
            case 'thisMonth':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                end.setMonth(now.getMonth() + 1, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'lastMonth':
                start.setMonth(now.getMonth() - 1, 1);
                start.setHours(0, 0, 0, 0);
                end.setMonth(now.getMonth(), 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'thisYear':
                start.setMonth(0, 1);
                start.setHours(0, 0, 0, 0);
                end.setMonth(11, 31);
                end.setHours(23, 59, 59, 999);
                break;
            case 'lastYear':
                start.setFullYear(now.getFullYear() - 1, 0, 1);
                start.setHours(0, 0, 0, 0);
                end.setFullYear(now.getFullYear() - 1, 11, 31);
                end.setHours(23, 59, 59, 999);
                break;
            default:
                return { start: null, end: null };
        }

        return { start: start.toISOString(), end: end.toISOString() };
    }
}