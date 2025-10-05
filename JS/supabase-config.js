// Supabase configuration
class SupabaseConfig {
    static SUPABASE_URL = 'https://lgvbltlxwbpwojjkobbr.supabase.co';
    static SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndmJsdGx4d2Jwd29qamtvYmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NjI3ODQsImV4cCI6MjA3NTEzODc4NH0.dXqnS2BAZ1sCxFhB9HEK5a3zfqyh7sozoBCWqhr332E';
    
    static client = null;

    static init() {
        if (!this.client) {
            try {
                // Check if supabase is available globally from CDN
                if (typeof supabase !== 'undefined') {
                    this.client = supabase.createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
                    console.log('Supabase client initialized successfully');
                    this.testConnection();
                } else {
                    console.error('Supabase CDN not loaded properly');
                    this.showCdnError();
                }
            } catch (error) {
                console.error('Error initializing Supabase client:', error);
                this.showInitError();
            }
        }
        return this.client;
    }

    static async testConnection() {
        try {
            const { data, error } = await this.client.from('items').select('count');
            if (error) {
                console.warn('Supabase connection test failed:', error.message);
                this.showConnectionError(error);
            } else {
                console.log('Supabase connected successfully');
            }
        } catch (error) {
            console.error('Supabase connection error:', error);
            this.showConnectionError(error);
        }
    }

    static showCdnError() {
        const errorMsg = 'Supabase CDN failed to load. Please check your internet connection.';
        console.error(errorMsg);
        if (typeof Utils !== 'undefined') {
            Utils.showNotification(errorMsg, 'error');
        } else {
            // Fallback notification
            this.showFallbackNotification(errorMsg, 'error');
        }
    }

    static showInitError() {
        const errorMsg = 'Failed to initialize database connection. Please refresh the page.';
        console.error(errorMsg);
        if (typeof Utils !== 'undefined') {
            Utils.showNotification(errorMsg, 'error');
        } else {
            this.showFallbackNotification(errorMsg, 'error');
        }
    }

    static showConnectionError(error) {
        const errorMsg = `Database connection issue: ${error.message}`;
        console.error(errorMsg);
        if (typeof Utils !== 'undefined') {
            Utils.showNotification('Database connection issue. Some features may not work.', 'warning');
        } else {
            this.showFallbackNotification('Database connection issue', 'warning');
        }
    }

    static showFallbackNotification(message, type) {
        // Create a simple notification if Utils is not available
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            z-index: 1000;
            background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    static getClient() {
        if (!this.client) {
            return this.init();
        }
        return this.client;
    }
}

// Initialize Supabase when the script loads
document.addEventListener('DOMContentLoaded', function() {
    SupabaseConfig.init();
});

// Make it globally available
window.SupabaseConfig = SupabaseConfig;