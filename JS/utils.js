// =====================
// SHARED UTILITIES
// =====================

// Configuration
const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbw7LfLlRoRbfVSbKpfJvK6n-jZHvv9fkgKGzlpnhrHiNgiEE4e4RQY8Yg9lDr4eq_dToQ/exec",
    TIMEOUT: 15000, // Reduced from 30s to 15s
    MAX_RETRIES: 2,  // Reduced from 3 to 2
    DATE_FORMAT: {
        display: "en-GB",
        currency: "en-IN"
    }
};

// Global variables
window.pageHistory = [];
window.tempSaleItems = [];
window.tempPurchaseItems = [];

// Universal CORS Handler
class UniversalCORSHandler {
    static async callAPI(action, params = {}) {
        console.log(`🔧 API Call: ${action}`, params);
        
        // Validate input
        this.validateAction(action);
        const sanitizedParams = this.sanitizeParams(params);
        
        const methods = [
            { name: 'DirectFetch', method: () => this.tryDirectFetch(action, sanitizedParams) },
            { name: 'CORSProxy', method: () => this.tryCORSProxy(action, sanitizedParams) },
            { name: 'JSONP', method: () => this.tryJSONP(action, sanitizedParams) }
        ];
        
        let lastError;
        
        for (const { name, method } of methods) {
            try {
                console.log(`🔄 Trying ${name} for ${action}`);
                const result = await this.tryWithRetry(method, name);
                
                console.log(`✅ ${name} succeeded for ${action}`, result);
                
                // Handle different response formats
                return this.normalizeResponse(result);
                
            } catch (error) {
                console.warn(`❌ ${name} failed for ${action}:`, error.message);
                lastError = error;
                continue;
            }
        }
        
        console.error(`💥 All methods failed for ${action}:`, lastError);
        throw lastError || new Error(`All methods failed for ${action}`);
    }
    
    static async tryWithRetry(apiCall, methodName, maxRetries = CONFIG.MAX_RETRIES) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await apiCall();
            } catch (error) {
                console.log(`Attempt ${attempt}/${maxRetries} failed for ${methodName}:`, error.message);
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Retry on network errors or specific status codes
                const shouldRetry = this.shouldRetry(error);
                if (shouldRetry) {
                    const delayMs = 1000 * attempt;
                    console.log(`Retrying ${methodName} in ${delayMs}ms...`);
                    await this.delay(delayMs);
                    continue;
                }
                
                throw error;
            }
        }
    }
    
    static shouldRetry(error) {
        // Retry on network errors
        if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
            return true;
        }
        
        // Retry on these HTTP status codes
        if (error.message.includes('408') || // Timeout
            error.message.includes('429') || // Too Many Requests
            error.message.includes('5')) {   // Server errors
            return true;
        }
        
        return false;
    }
    
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    static validateAction(action) {
        if (!action || typeof action !== 'string') {
            throw new Error('Action must be a non-empty string');
        }
        
        // Prevent potential injection attacks
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(action)) {
            throw new Error('Invalid action name format');
        }
    }
    
    static sanitizeParams(params) {
        const sanitized = {};
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                // Basic sanitization - extend based on your needs
                if (typeof value === 'string') {
                    sanitized[key] = value.trim().slice(0, 1000); // Limit length
                } else {
                    sanitized[key] = value;
                }
            }
        }
        return sanitized;
    }
    
    static normalizeResponse(result) {
        // Handle empty response
        if (result === null || result === undefined) {
            return { success: false, error: 'Empty response' };
        }
        
        // Already normalized response
        if (result && typeof result === 'object' && 'success' in result) {
            return result;
        }
        
        // Array response
        if (Array.isArray(result)) {
            return { success: true, data: result };
        }
        
        // String ID response
        if (typeof result === 'string' && !isNaN(result)) {
            return { success: true, id: parseInt(result) };
        }
        
        // Plain object
        if (typeof result === 'object') {
            return { success: true, ...result };
        }
        
        // String response
        if (typeof result === 'string') {
            return { success: true, message: result };
        }
        
        return { success: true, data: result };
    }
    
    static async tryDirectFetch(action, params) {
        const url = this.buildURL(action, params);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit',
                headers: { 
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                const text = await response.text();
                // Try to parse as JSON anyway (some APIs don't set content-type properly)
                try {
                    return JSON.parse(text);
                } catch {
                    return text;
                }
            }
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }
    
    static async tryCORSProxy(action, params) {
        const url = this.buildURL(action, params);
        
        const proxies = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            `https://corsproxy.io/?${encodeURIComponent(url)}`,
            `https://cors-anywhere.herokuapp.com/${url}`,
            `https://thingproxy.freeboard.io/fetch/${url}`
        ];
        
        for (const proxyUrl of proxies) {
            try {
                console.log(`Trying proxy: ${proxyUrl.split('/')[2]}`); // Log domain only
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // Shorter timeout for proxies
                
                const response = await fetch(proxyUrl, { 
                    method: 'GET',
                    headers: { 
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const text = await response.text();
                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        console.warn('Proxy response not JSON:', text.substring(0, 100));
                        return text;
                    }
                } else {
                    console.warn(`Proxy responded with ${response.status}`);
                }
            } catch (error) {
                console.warn(`Proxy ${proxyUrl.split('/')[2]} failed:`, error.message);
                continue;
            }
        }
        
        throw new Error('All CORS proxies failed');
    }
    
    static async tryJSONP(action, params) {
        return new Promise((resolve, reject) => {
            const callbackName = `jsonp_${action}_${Date.now()}`;
            const url = this.buildURL(action, { ...params, callback: callbackName });
            
            const script = document.createElement('script');
            script.src = url;
            
            let timeoutId;
            let cleanedUp = false;
            
            const cleanup = () => {
                if (cleanedUp) return;
                cleanedUp = true;
                
                clearTimeout(timeoutId);
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                delete window[callbackName];
            };
            
            // Set success callback
            window[callbackName] = function(data) {
                cleanup();
                resolve(data);
            };
            
            // Handle errors
            script.onerror = () => {
                cleanup();
                reject(new Error('JSONP request failed'));
            };
            
            // Timeout
            timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error('JSONP timeout'));
            }, 15000);
            
            // Start request
            document.body.appendChild(script);
        });
    }
    
    static buildURL(action, params = {}) {
        let url = `${CONFIG.API_URL}?action=${encodeURIComponent(action)}`;
        
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url += `&${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`;
            }
        });
        
        return url;
    }
}

// Validation Utilities
class Validator {
    static validateRequiredFields(fields, data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Data must be an object');
        }
        
        const missing = fields.filter(field => {
            const value = data[field];
            return value === undefined || value === null || value === '';
        });
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
    }
    
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    static validatePhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }
    
    static validateNumber(value, min = -Infinity, max = Infinity) {
        const num = Number(value);
        return !isNaN(num) && num >= min && num <= max;
    }
}

// Security & Sanitization Utilities
class Security {
    static escapeHtml(str) {
        if (str === null || str === undefined) return "";
        
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }
    
    static sanitizeInput(input, options = {}) {
        if (input === null || input === undefined) return "";
        
        let result = String(input);
        
        // Trim whitespace
        if (options.trim !== false) {
            result = result.trim();
        }
        
        // Remove scripts and dangerous HTML
        if (options.allowHTML === false) {
            result = this.escapeHtml(result);
        }
        
        // Limit length
        if (options.maxLength) {
            result = result.slice(0, options.maxLength);
        }
        
        return result;
    }
    
    static sanitizeNumber(input, options = {}) {
        if (input === null || input === undefined) return options.defaultValue || 0;
        
        const num = Number(input);
        if (isNaN(num)) return options.defaultValue || 0;
        
        // Apply bounds
        let result = num;
        if (options.min !== undefined) result = Math.max(options.min, result);
        if (options.max !== undefined) result = Math.min(options.max, result);
        if (options.positive) result = Math.max(0, result);
        if (options.integer) result = Math.round(result);
        
        return result;
    }
}

// Date & Time Utilities
class DateUtils {
    static formatDate(date = new Date(), options = {}) {
        const targetDate = this.parseDate(date);
        if (!targetDate) return "Invalid Date";
        
        const formatOptions = {
            day: "2-digit",
            month: "short", 
            year: "numeric",
            ...options
        };
        
        return targetDate.toLocaleDateString(CONFIG.DATE_FORMAT.display, formatOptions);
    }
    
    static formatDateTime(date = new Date()) {
        const targetDate = this.parseDate(date);
        if (!targetDate) return "Invalid Date";
        
        return targetDate.toLocaleString(CONFIG.DATE_FORMAT.display, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }
    
    static formatDateForInput(date) {
        const targetDate = this.parseDate(date);
        if (!targetDate) return formatDateForInput(new Date());
        
        return targetDate.toISOString().split('T')[0];
    }
    
    static parseDate(date) {
        if (date instanceof Date) {
            return isNaN(date.getTime()) ? null : date;
        }
        
        const parsed = new Date(date);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    
    static isSameDay(date1, date2) {
        const d1 = this.parseDate(date1);
        const d2 = this.parseDate(date2);
        
        if (!d1 || !d2) return false;
        
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }
    
    static isToday(date) {
        return this.isSameDay(date, new Date());
    }
    
    static addDays(date, days) {
        const result = this.parseDate(date);
        if (!result) return new Date();
        
        result.setDate(result.getDate() + days);
        return result;
    }
}

// Financial Utilities
class FinancialUtils {
    static formatCurrency(amount, currency = 'INR') {
        const numAmount = Security.sanitizeNumber(amount, { defaultValue: 0 });
        
        return new Intl.NumberFormat(CONFIG.DATE_FORMAT.currency, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(numAmount);
    }
    
    static calculateTotal(items, quantityField = 'quantity', priceField = 'price') {
        if (!Array.isArray(items)) return 0;
        
        return items.reduce((total, item) => {
            const quantity = Security.sanitizeNumber(item[quantityField], { positive: true });
            const price = Security.sanitizeNumber(item[priceField], { positive: true });
            return total + (quantity * price);
        }, 0);
    }
    
    static calculateTax(amount, taxRate) {
        const numAmount = Security.sanitizeNumber(amount, { positive: true });
        const numTaxRate = Security.sanitizeNumber(taxRate, { positive: true, max: 100 });
        
        return (numAmount * numTaxRate) / 100;
    }
}

// Storage Utilities
class Storage {
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('LocalStorage set failed:', error);
            return false;
        }
    }
    
    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('LocalStorage get failed:', error);
            return defaultValue;
        }
    }
    
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('LocalStorage remove failed:', error);
            return false;
        }
    }
    
    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.warn('LocalStorage clear failed:', error);
            return false;
        }
    }
}

// UI & DOM Utilities
class UIUtils {
    static showLoading(element = document.body) {
        this.hideLoading(); // Remove any existing loaders
        
        const loader = document.createElement('div');
        loader.className = 'global-loader';
        loader.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            ">
                <div style="
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                ">
                    <div class="spinner"></div>
                    <span>Loading...</span>
                </div>
            </div>
        `;
        
        element.appendChild(loader);
    }
    
    static hideLoading() {
        const existingLoader = document.querySelector('.global-loader');
        if (existingLoader) {
            existingLoader.remove();
        }
    }
    
    static showNotification(message, type = 'info', duration = 5000) {
        // Remove existing notifications
        this.hideNotification();
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${this.getNotificationColor(type)};
                color: white;
                padding: 12px 20px;
                border-radius: 4px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                max-width: 400px;
                word-wrap: break-word;
            ">
                ${Security.escapeHtml(message)}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto hide
        setTimeout(() => {
            this.hideNotification();
        }, duration);
    }
    
    static hideNotification() {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
    }
    
    static getNotificationColor(type) {
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336'
        };
        return colors[type] || colors.info;
    }
    
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }
    
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Page Navigation
class Navigation {
    static showPage(id) {
        const currentPage = document.querySelector('.page:not(.hidden)');
        if (currentPage && currentPage.id !== id) {
            if (pageHistory[pageHistory.length - 1] !== currentPage.id) {
                pageHistory.push(currentPage.id);
            }
        }
    
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        
        const page = document.getElementById(id);
        if (!page) {
            console.error('Page not found:', id);
            return this.showPage('dashboard');
        }
        
        page.classList.remove('hidden');
        console.log('Navigated to:', id, 'History:', pageHistory);
        
        // Dispatch custom event for page changes
        window.dispatchEvent(new CustomEvent('pageChanged', { detail: { pageId: id } }));
    }
    
    static goBackToPreviousPage() {
        console.log('Back button clicked. History:', pageHistory);
        
        if (pageHistory.length > 0) {
            const previousPage = pageHistory.pop();
            console.log('Going back to:', previousPage);
            
            document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
            
            const page = document.getElementById(previousPage);
            if (page) {
                page.classList.remove('hidden');
                console.log('Successfully navigated back to:', previousPage);
            } else {
                console.error('Previous page not found:', previousPage);
                this.showPage('dashboard');
            }
        } else {
            console.log('No history, going to dashboard');
            this.showPage('dashboard');
        }
    }
    
    static goToDashboard() {
        pageHistory = [];
        this.showPage('dashboard');
    }
    
    static getCurrentPage() {
        return document.querySelector('.page:not(.hidden)')?.id || 'dashboard';
    }
}

// Error Handling
class ErrorHandler {
    static handleAPIError(error, userFriendlyMessage = 'Operation failed') {
        console.error('API Error:', error);
        
        let message = userFriendlyMessage;
        
        if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
            message = 'Network error. Please check your connection.';
        } else if (error.message.includes('timeout')) {
            message = 'Request timeout. Please try again.';
        } else if (error.message.includes('5')) {
            message = 'Server error. Please try again later.';
        }
        
        UIUtils.showNotification(message, 'error');
        return { success: false, error: message };
    }
    
    static wrapAsync(fn, errorMessage = 'Operation failed') {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                return this.handleAPIError(error, errorMessage);
            }
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UniversalCORSHandler,
        Validator,
        Security,
        DateUtils,
        FinancialUtils,
        Storage,
        UIUtils,
        Navigation,
        ErrorHandler,
        CONFIG
    };
}
// =====================
// LEGACY GLOBAL FUNCTIONS
// Maintain backward compatibility with existing code
// =====================

// Navigation Functions
// function showPage(id) {
//     console.log('📄 showPage (legacy) called with:', id);
//     Navigation.showPage(id);
// }

// function goBackToPreviousPage() {
//     console.log('🔙 goBackToPreviousPage (legacy) called');
//     Navigation.goBackToPreviousPage();
// }

// function goToDashboard() {
//     console.log('🏠 goToDashboard (legacy) called');
//     Navigation.goToDashboard();
// }

// // Utility Functions
function escapeHtml(str) {
    return Security.escapeHtml(str);
}

function formatDate(date = new Date()) {
    return DateUtils.formatDate(date);
}

function formatDateForInput(date) {
    return DateUtils.formatDateForInput(date);
}

function isSameDay(date1, date2) {
    return DateUtils.isSameDay(date1, date2);
}

function showDemoData(type) {
    console.log(`Showing demo data for: ${type}`);
    UIUtils.showNotification(`Using demo data - ${type}`, 'info');
}

// CORS Handler Global Access
window.UniversalCORSHandler = UniversalCORSHandler;

// Make sure these are available globally for HTML onclick handlers
window.showPage = showPage;
window.goBackToPreviousPage = goBackToPreviousPage;
window.goToDashboard = goToDashboard;