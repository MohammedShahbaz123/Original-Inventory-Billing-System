// =====================
// Google Apps Script URL
// =====================
const API_URL = "https://script.google.com/macros/s/AKfycbw0vH_03yswOFsJwYAYMWOi9avz3UYW_0mR1KE7oKK5mhqHg4ZVaij9KZD2GQB8fqQykw/exec";

// =====================
// Universal CORS Handler for All API Calls
// =====================
class UniversalCORSHandler {
  static async callAPI(action, params = {}) {
    const url = this.buildURL(action, params);
    
    const methods = [
      this.tryDirectFetch.bind(this),
      this.tryJSONP.bind(this),
      this.tryCORSProxy.bind(this)
    ];
    
    for (const method of methods) {
      try {
        console.log(`🔄 Trying ${method.name} for ${action}`);
        const result = await method(url);
        
        // Handle different response formats
        if (result && result.success !== undefined) {
          return result;
        } else if (Array.isArray(result)) {
          return { success: true, data: result };
        } else {
          return { success: true, ...result };
        }
        
      } catch (error) {
        console.warn(`❌ ${method.name} failed for ${action}:`, error.message);
        continue;
      }
    }
    
    throw new Error(`All methods failed for ${action}`);
  }
  
  static buildURL(action, params = {}) {
    let url = `${API_URL}?action=${action}`;
    
    // Add parameters
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url += `&${key}=${encodeURIComponent(params[key])}`;
      }
    });
    
    return url;
  }
  
  static async tryDirectFetch(url) {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  }
  
  static async tryJSONP(url) {
    return new Promise((resolve, reject) => {
      const callbackName = 'callback_' + Date.now();
      const script = document.createElement('script');
      
      const jsonpUrl = url + (url.includes('?') ? '&' : '?') + `callback=${callbackName}`;
      script.src = jsonpUrl;
      
      window[callbackName] = function(data) {
        delete window[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };
      
      script.onerror = () => {
        delete window[callbackName];
        document.body.removeChild(script);
        reject(new Error('JSONP failed'));
      };
      
      document.body.appendChild(script);
      
      setTimeout(() => {
        if (window[callbackName]) {
          delete window[callbackName];
          document.body.removeChild(script);
          reject(new Error('JSONP timeout'));
        }
      }, 10000);
    });
  }
  
  static async tryCORSProxy(url) {
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://cors-anywhere.herokuapp.com/${url}`
    ];
    
    for (const proxyUrl of proxies) {
      try {
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const text = await response.text();
          try {
            return JSON.parse(text);
          } catch (e) {
            return text;
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    throw new Error('All proxies failed');
  }
}

// =====================
// Keyboard Shortcut Manager
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
                { keys: ['Alt', 'U'], description: 'View Purchases' }
            ],
            'salesInvoice': [
                { keys: ['Alt', 'Enter'], description: 'Save Invoice' },
                { keys: ['Enter'], description: 'Next Field' },
                { keys: ['Escape'], description: 'Back to Dashboard' },
                { keys: ['Alt', 'ArrowLeft'], description: 'Go Back' }
            ],
            'purchaseInvoice': [
                { keys: ['Alt', 'Enter'], description: 'Save Invoice' },
                { keys: ['Enter'], description: 'Next Field' },
                { keys: ['Escape'], description: 'Back to Dashboard' },
                { keys: ['Alt', 'ArrowLeft'], description: 'Go Back' }
            ],
            'inventory': [
                { keys: ['Alt', 'N'], description: 'Add New Item' },
                { keys: ['Escape'], description: 'Back to Dashboard' },
                { keys: ['Alt', 'ArrowLeft'], description: 'Go Back' }
            ],
            'sales': [
                { keys: ['Alt', 'S'], description: 'Create Sales Invoice' },
                { keys: ['Escape'], description: 'Back to Dashboard' },
                { keys: ['Alt', 'ArrowLeft'], description: 'Go Back' }
            ],
            'purchases': [
                { keys: ['Alt', 'P'], description: 'Create Purchase Invoice' },
                { keys: ['Escape'], description: 'Back to Dashboard' },
                { keys: ['Alt', 'ArrowLeft'], description: 'Go Back' }
            ],
            'invoicePage': [
                { keys: ['Alt', 'Print'], description: 'Print Invoice' },
                { keys: ['Alt', 'D'], description: 'Download PDF' },
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
// Shortcut Bar Component
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

// =====================
// Enhanced Page Switching with Shortcut Bar
// =====================
function showPage(id) {
    // Get current page before switching
    const currentPage = document.querySelector('.page:not(.hidden)');
    if (currentPage && currentPage.id !== id) {
        if (pageHistory[pageHistory.length - 1] !== currentPage.id) {
            pageHistory.push(currentPage.id);
        }
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    
    // Show target page
    const page = document.getElementById(id);
    if (!page) return;
    page.classList.remove('hidden');

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

    // Load dropdown items & parties for invoices
    if (id === "salesInvoice" || id === "purchaseInvoice") {
        loadItemsDropdown();
        loadParties();
    }
    
    console.log('Navigated to:', id, 'History:', pageHistory);
}

// =====================
// Register Global Shortcuts
// =====================
function registerGlobalShortcuts() {
    // Navigation shortcuts
    shortcutManager.register(['Alt', 'S'], () => showPage("salesInvoice"), "Sales Invoice");
    shortcutManager.register(['Alt', 'P'], () => showPage("purchaseInvoice"), "Purchase Invoice");
    shortcutManager.register(['Alt', 'I'], () => loadInventory(), "Inventory");
    shortcutManager.register(['Alt', 'L'], () => loadSales(), "Sales");
    shortcutManager.register(['Alt', 'U'], () => loadPurchases(), "Purchases");
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
}

// =====================
// Enhanced Dashboard with Quick Actions
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
                    </div>
                </div>
            `;
            dashboard.insertAdjacentHTML('afterbegin', quickActionsHTML);
        }
    }
}

// =====================
// Update DOM Content Loaded
// =====================
document.addEventListener('DOMContentLoaded', function() {
    // Dashboard navigation
    document.querySelectorAll('[onclick*="showPage"]').forEach(button => {
        const oldOnClick = button.getAttribute('onclick');
        if (oldOnClick.includes("showPage('dashboard')")) {
            button.setAttribute('onclick', oldOnClick.replace("showPage('dashboard')", "goToDashboard()"));
        }
    });

    // Register shortcuts and enhance UI
    registerGlobalShortcuts();
    enhanceDashboard();
    
    // Add global styles for shortcut bar
    addShortcutBarStyles();
});

// =====================
// CSS Styles for Shortcut Bar
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
        }
        
        .shortcut-items {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            font-size: 12px;
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
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
        
        .sales-btn { border-left: 4px solid #e74c3c; }
        .purchase-btn { border-left: 4px solid #3498db; }
        .inventory-btn { border-left: 4px solid #27ae60; }
        .sales-view-btn { border-left: 4px solid #9b59b6; }
        .purchases-view-btn { border-left: 4px solid #f39c12; }
        
        .sales-btn:hover { background: #ffeaea; }
        .purchase-btn:hover { background: #e8f4fd; }
        .inventory-btn:hover { background: #eafaf1; }
        .sales-view-btn:hover { background: #f4eef8; }
        .purchases-view-btn:hover { background: #fef9e7; }
        
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
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// =====================
// Enhanced Input Focus with Shortcut Hints
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
        'itemName': 'Enter item name (Alt+N to focus here from inventory)'
    };
    
    Object.keys(enhancedFields).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.setAttribute('title', enhancedFields[id]);
        }
    });
}

// =====================
// Update existing functions to include shortcut enhancements
// =====================

// Update the existing keyboard event listener to use the shortcut manager
document.addEventListener("keydown", function (e) {
    // Let the shortcut manager handle registered shortcuts
    // Keep existing unregistered shortcuts below
    
    // Enter => Next Input Focus (keep this as it's not in shortcut manager)
    if (e.key === "Enter" && !e.altKey && !e.ctrlKey && !e.shiftKey) {
        const formInputs = Array.from(
            document.querySelectorAll("input, select")
        ).filter(el => el.offsetParent !== null);

        const currentIndex = formInputs.indexOf(document.activeElement);
        if (currentIndex > -1 && currentIndex < formInputs.length - 1) {
            e.preventDefault();
            formInputs[currentIndex + 1].focus();
        }
    }
});

// Initialize enhanced fields after DOM load
setTimeout(enhanceInputFields, 1000);

// =====================
// REST OF YOUR ORIGINAL CODE CONTINUES BELOW...
// (All your existing functions remain exactly the same)
// =====================

// Create Item
async function addItem() {
  const name = document.getElementById("itemName").value.trim();
  const price = Number(document.getElementById("itemPrice").value);
  const stock = Number(document.getElementById("itemStock").value);

  if (!name || price <= 0 || stock < 0) {
    alert("Enter valid item details!");
    return;
  }

  try {
    const result = await UniversalCORSHandler.callAPI('addItem', {
      name: name,
      price: price,
      stock: stock
    });

    if (result.success) {
      alert("Item added!");
      document.getElementById("itemName").value = "";
      document.getElementById("itemPrice").value = "";
      document.getElementById("itemStock").value = "";
      loadItemsDropdown();
    } else {
      throw new Error(result.error || 'Failed to add item');
    }
  } catch (err) {
    console.error("Failed to add item:", err);
    alert("Failed to add item: " + err.message);
  }
}

// =====================
// Enhanced Party Management
// =====================

function showPartyManagement() {
    showPage("partyManagement");
    loadParties();
}

// =====================
// Enhanced loadParties with Debugging
// =====================
async function loadParties() {
  try {
    const result = await UniversalCORSHandler.callAPI('getParties');
    
    if (result.success) {
      updatePartyUI(result.parties || []);
    } else {
      throw new Error(result.error || 'Failed to load parties');
    }
    
  } catch (err) {
    console.error("Failed to load parties:", err);
    showPartyError("Failed to load parties: " + err.message);
    updatePartyUI([]);
  }
}

// Fallback function when API fails
function showFallbackParties() {
  console.log("🔄 Showing fallback parties data...");
  
  const demoParties = [
    "Customer A",
    "Supplier XYZ", 
    "Wholesaler Corp",
    "Retail Partner",
    "Local Store"
  ];
  
  updatePartyUI(demoParties);
  showPartyMessage("⚠️ Using demo data (API not available)", "info");
}

async function addParty() {
  const partyNameInput = document.getElementById('partyName');
  if (!partyNameInput) return;

  const name = partyNameInput.value.trim();
  if (!name) {
    showPartyError("Party name cannot be empty!");
    partyNameInput.focus();
    return;
  }

  try {
    const result = await UniversalCORSHandler.callAPI('addParty', { name: name });

    if (result.success) {
      showPartyMessage("Party added successfully!", "success");
      partyNameInput.value = '';
      partyNameInput.focus();
      loadParties();
    } else {
      throw new Error(result.error || 'Failed to add party');
    }
  } catch (err) {
    console.error("Failed to add party:", err);
    showPartyError("Failed to add party: " + err.message);
  }
}

// Enhanced updatePartyUI function
function updatePartyUI(parties) {
    const container = document.getElementById("partyManagement");
    if (!container) return;

    // Create or update the party management UI
    let partyHTML = `
        <div class="party-header">
            <h2>🎯 Party Management</h2>
            <div class="party-actions">
                <button onclick="showCreatePartyForm()" class="create-party-btn">
                    <span class="btn-icon">➕</span>
                    Create New Party
                </button>
                <button onclick="refreshParties()" class="refresh-btn">
                    <span class="btn-icon">🔄</span>
                    Refresh
                </button>
            </div>
        </div>

        <div class="party-content">
            <div class="parties-list-section">
                <h3>📋 Existing Parties (${parties.length})</h3>
                
                ${parties.length > 0 ? `
                    <div class="parties-grid">
                        ${parties.map(party => `
                            <div class="party-card">
                                <div class="party-info">
                                    <span class="party-name">${escapeHtml(party)}</span>
                                </div>
                                <div class="party-actions">
                                    <button onclick="editParty('${escapeHtml(party)}')" class="edit-btn" title="Edit Party">
                                        ✏️
                                    </button>
                                    <button onclick="deleteParty('${escapeHtml(party)}')" class="delete-btn" title="Delete Party">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="no-parties">
                        <div class="no-parties-icon">🏢</div>
                        <h4>No Parties Found</h4>
                        <p>Get started by creating your first party!</p>
                        <button onclick="showCreatePartyForm()" class="create-first-party-btn">
                            Create Your First Party
                        </button>
                    </div>
                `}
            </div>

            <div class="create-party-section">
                <div class="create-party-form" id="createPartyForm">
                    <h3>➕ Create New Party</h3>
                    <div class="form-group">
                        <label for="partyName">Party Name:</label>
                        <input 
                            type="text" 
                            id="partyName" 
                            placeholder="Enter party name..."
                            onkeypress="if(event.key === 'Enter') addParty()"
                        >
                    </div>
                    <div class="form-actions">
                        <button onclick="addParty()" class="save-party-btn">
                            <span class="btn-icon">💾</span>
                            Save Party
                        </button>
                        <button onclick="clearPartyForm()" class="clear-btn">
                            <span class="btn-icon">🗑️</span>
                            Clear
                        </button>
                    </div>
                    <div class="form-shortcuts">
                        <small>💡 Press Enter to save, Esc to clear</small>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = partyHTML;

    // Update dropdowns in other sections
    updatePartyDropdowns(parties);
}

function showPartyMessage(message, type) {

}

// Update party dropdowns in sales and purchase sections
function updatePartyDropdowns(parties) {
    const saleParty = document.getElementById("saleParty");
    const purchaseParty = document.getElementById("purchaseParty");

    if (saleParty) {
        saleParty.innerHTML = `<option value="">-- Select Party --</option>`;
        parties.forEach(p => {
            let opt = document.createElement("option");
            opt.value = p;
            opt.textContent = p;
            saleParty.appendChild(opt);
        });
    }

    if (purchaseParty) {
        purchaseParty.innerHTML = `<option value="">-- Select Party --</option>`;
        parties.forEach(p => {
            let opt = document.createElement("option");
            opt.value = p;
            opt.textContent = p;
            purchaseParty.appendChild(opt);
        });
    }
}

// Show create party form (standalone version)
function showCreatePartyForm() {
    document.getElementById('partyName')?.focus();
}

// Clear party form
function clearPartyForm() {
    const partyNameInput = document.getElementById('partyName');
    if (partyNameInput) {
        partyNameInput.value = '';
        partyNameInput.focus();
    }
}

// Edit party function
function editParty(partyName) {
    const newName = prompt("Edit party name:", partyName);
    if (newName && newName.trim() && newName !== partyName) {
        updateParty(partyName, newName.trim());
    }
}

// Update party function
async function updateParty(oldName, newName) {
    try {
        const url = `${API_URL}?action=updateParty&oldName=${encodeURIComponent(oldName)}&newName=${encodeURIComponent(newName)}`;
        
        const res = await fetch(url);
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const responseText = await res.text();
        let data;
        
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            if (res.ok) {
                data = { success: true };
            } else {
                throw new Error("Invalid response from server");
            }
        }

        if (data.success) {
            showPartyMessage("Party updated successfully!", "success");
            loadParties();
        } else {
            alert(data.error || "Failed to update party.");
        }
    } catch (err) {
        console.error("Failed to update party:", err);
        showPartyError("Failed to update party: " + err.message);
    }
}

// Delete party function
async function deleteParty(partyName) {
    if (!confirm(`Are you sure you want to delete the party "${partyName}"?`)) {
        return;
    }

    try {
        const url = `${API_URL}?action=deleteParty&name=${encodeURIComponent(partyName)}`;
        
        const res = await fetch(url);
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const responseText = await res.text();
        let data;
        
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            if (res.ok) {
                data = { success: true };
            } else {
                throw new Error("Invalid response from server");
            }
        }

        if (data.success) {
            showPartyMessage("Party deleted successfully!", "success");
            loadParties();
        } else {
            alert(data.error || "Failed to delete party.");
        }
    } catch (err) {
        console.error("Failed to delete party:", err);
        showPartyError("Failed to delete party: " + err.message);
    }
}

// Refresh parties
function refreshParties() {
    loadParties();
    showPartyMessage("Parties list refreshed!", "info");
}

// Show party message
function showPartyMessage(message, type = "info") {
    // Remove existing message
    const existingMessage = document.querySelector('.party-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `party-message party-message-${type}`;
    messageDiv.innerHTML = `
        <span class="message-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="message-text">${message}</span>
        <button onclick="this.parentElement.remove()" class="message-close">×</button>
    `;

    const container = document.getElementById("partyManagement");
    if (container) {
        container.insertBefore(messageDiv, container.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

// Show party error
function showPartyError(message) {
    showPartyMessage(message, "error");
}

// Add party management to shortcut manager
function registerPartyShortcuts() {
    shortcutManager.register(['Alt', 'T'], () => showPartyManagement(), "Party Management");
}

// Update the showPage function to handle party management
function showPage(id) {
    // Get current page before switching
    const currentPage = document.querySelector('.page:not(.hidden)');
    if (currentPage && currentPage.id !== id) {
        if (pageHistory[pageHistory.length - 1] !== currentPage.id) {
            pageHistory.push(currentPage.id);
        }
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    
    // Show target page
    const page = document.getElementById(id);
    if (!page) return;
    page.classList.remove('hidden');

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

    // Load dropdown items & parties for invoices
    if (id === "salesInvoice" || id === "purchaseInvoice") {
        loadItemsDropdown();
        loadParties();
    }
    
    // Special handling for party management
    if (id === "partyManagement") {
        loadParties();
    }
    
    console.log('Navigated to:', id, 'History:', pageHistory);
}

// Add party management CSS styles
function addPartyManagementStyles() {
    const styles = `
        .party-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e0e6ed;
        }
        
        .party-header h2 {
            margin: 0;
            color: #2c3e50;
            font-size: 1.8em;
        }
        
        .party-actions {
            display: flex;
            gap: 10px;
        }
        
        .create-party-btn, .refresh-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .create-party-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .refresh-btn {
            background: #f8f9fa;
            color: #6c757d;
            border: 1px solid #dee2e6;
        }
        
        .create-party-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        .refresh-btn:hover {
            background: #e9ecef;
            transform: translateY(-1px);
        }
        
        .party-content {
            display: grid;
            grid-template-columns: 1fr 350px;
            gap: 30px;
            align-items: start;
        }
        
        .parties-list-section {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .parties-list-section h3 {
            margin: 0 0 20px 0;
            color: #2c3e50;
            font-size: 1.3em;
        }
        
        .parties-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 15px;
            max-height: 500px;
            overflow-y: auto;
            padding: 10px;
        }
        
        .party-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            transition: all 0.3s ease;
        }
        
        .party-card:hover {
            background: #e3f2fd;
            transform: translateX(5px);
        }
        
        .party-info {
            flex: 1;
        }
        
        .party-name {
            font-weight: 600;
            color: #2c3e50;
            font-size: 14px;
        }
        
        .party-actions {
            display: flex;
            gap: 5px;
        }
        
        .edit-btn, .delete-btn {
            background: none;
            border: none;
            padding: 5px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
        }
        
        .edit-btn:hover {
            background: #667eea;
            color: white;
        }
        
        .delete-btn:hover {
            background: #e74c3c;
            color: white;
        }
        
        .no-parties {
            text-align: center;
            padding: 40px 20px;
            color: #6c757d;
        }
        
        .no-parties-icon {
            font-size: 48px;
            margin-bottom: 15px;
        }
        
        .no-parties h4 {
            margin: 0 0 10px 0;
            color: #495057;
        }
        
        .no-parties p {
            margin: 0 0 20px 0;
        }
        
        .create-first-party-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .create-first-party-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        .create-party-section {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            position: sticky;
            top: 20px;
        }
        
        .create-party-form h3 {
            margin: 0 0 20px 0;
            color: #2c3e50;
            font-size: 1.3em;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #495057;
        }
        
        .form-group input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e6ed;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s ease;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .form-actions {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .save-party-btn, .clear-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .save-party-btn {
            background: #27ae60;
            color: white;
        }
        
        .save-party-btn:hover {
            background: #219a52;
            transform: translateY(-1px);
        }
        
        .clear-btn {
            background: #95a5a6;
            color: white;
        }
        
        .clear-btn:hover {
            background: #7f8c8d;
            transform: translateY(-1px);
        }
        
        .form-shortcuts {
            text-align: center;
            color: #6c757d;
            font-size: 12px;
        }
        
        .party-message {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 15px;
            margin-bottom: 20px;
            border-radius: 8px;
            font-weight: 500;
            animation: slideDown 0.3s ease;
        }
        
        .party-message-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .party-message-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .party-message-info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        
        .message-close {
            background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
            margin-left: auto;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @media (max-width: 1024px) {
            .party-content {
                grid-template-columns: 1fr;
            }
            
            .create-party-section {
                position: static;
            }
        }
        
        @media (max-width: 768px) {
            .party-header {
                flex-direction: column;
                gap: 15px;
                align-items: stretch;
            }
            
            .party-actions {
                justify-content: center;
            }
            
            .parties-grid {
                grid-template-columns: 1fr;
            }
            
            .form-actions {
                flex-direction: column;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Update the DOMContentLoaded to include party management
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Register party shortcuts
    registerPartyShortcuts();
    
    // Add party management styles
    addPartyManagementStyles();
});


// Load Items into Dropdowns
async function loadItemsDropdown() {
  const res = await fetch(`${API_URL}?action=getInventory`);
  const data = await res.json();
  const items = (Array.isArray(data) && data.length > 1) ? data.slice(1).map(row => row[1]) : [];

  const saleList = document.getElementById("saleItemsList");
  const purchaseList = document.getElementById("purchaseItemsList");

  if (saleList) saleList.innerHTML = "";
  if (purchaseList) purchaseList.innerHTML = "";

  items.forEach(item => {
    if (saleList) saleList.appendChild(new Option(item, item));
    if (purchaseList) purchaseList.appendChild(new Option(item, item));
  });

  const saleItemEl = document.getElementById("saleItem");
  const purchaseItemEl = document.getElementById("purchaseItem");
  if (saleItemEl) saleItemEl.value = "";
  if (purchaseItemEl) purchaseItemEl.value = "";
}

// Validate Item Input with focus
function isValidItem(inputId, listId) {
  const inputEl = document.getElementById(inputId);
  if (!inputEl) return false;
  const input = inputEl.value.trim();
  const list = document.getElementById(listId);
  if (!list) return true;

  const options = Array.from(list.options).map(opt => opt.value);

  if (!options.includes(input)) {
    alert("Please select a valid item from the list!");
    inputEl.focus();
    inputEl.select();
    return false;
  }
  return true;
}

// TEMP ARRAYS
let tempSaleItems = [];
let tempPurchaseItems = [];

// Add Sale Item - UPDATED to show calculation
function addSaleItemToInvoice() {
  if (!isValidItem("saleItem", "saleItemsList")) return;

  const item = document.getElementById("saleItem").value.trim();
  const qtyEl = document.getElementById("saleQty");
  const priceEl = document.getElementById("salePrice");
  const qty = Number(qtyEl.value);
  const price = Number(priceEl.value);

  if (!item || qty <= 0) {
    alert("Please enter a valid quantity!");
    qtyEl.focus();
    return;
  }
  if (price <= 0) {
    alert("Please enter a valid price!");
    priceEl.focus();
    return;
  }

  const subtotal = qty * price;
  tempSaleItems.push({ item, qty, price, subtotal });
  renderSaleInvoiceTable();

  document.getElementById("saleItem").value = "";
  qtyEl.value = "";
  priceEl.value = "";
  document.getElementById("saleItem").focus();
}

// Render sale invoice table - UPDATED to show calculation
function renderSaleInvoiceTable() {
  const table = document.getElementById("saleInvoiceTable");
  let html = `<thead>
      <tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th><th>Action</th></tr>
    </thead><tbody>`;

  tempSaleItems.forEach((row, i) => {
    html += `<tr>
      <td>${escapeHtml(row.item)}</td>
      <td>${row.qty}</td>
      <td>₹${row.price.toFixed(2)}</td>
      <td>₹${row.subtotal.toFixed(2)}</td>
      <td><button onclick="removeSaleItem(${i})">Remove</button></td>
    </tr>`;
  });

  const grandTotal = tempSaleItems.reduce((sum, item) => sum + item.subtotal, 0);
  html += `<tr style="font-weight: bold; background: #f0f0f0;">
    <td colspan="3" style="text-align: right;">Grand Total:</td>
    <td>₹${grandTotal.toFixed(2)}</td>
    <td></td>
  </tr>`;

  html += "</tbody>";
  if (table) table.innerHTML = html;
}

function removeSaleItem(i) {
  tempSaleItems.splice(i, 1);
  renderSaleInvoiceTable();
}

// Save sale invoice - UPDATED for subtotal
async function saveSaleInvoice() {
  const partyEl = document.getElementById("saleParty");
  if (!partyEl) return alert("Party selector not found!");
  const party = partyEl.value;
  if (!party) {
    alert("Please select a Party!");
    partyEl.focus();
    return;
  }

  if (tempSaleItems.length === 0) {
    alert("Add at least one item!");
    return;
  }

  const date = formatDate();
  
  try {
    const result = await UniversalCORSHandler.callAPI('addSaleInvoice', {
      date: date,
      party: party,
      items: JSON.stringify(tempSaleItems)
    });

    if (result.success) {
      const invoiceId = result.id;
      const savedItems = [...tempSaleItems];
      tempSaleItems = [];
      renderSaleInvoiceTable();

      showInvoicePage(invoiceId, date, savedItems, "Sale", party);
      alert("Sale invoice saved successfully!");
    } else {
      throw new Error(result.error || 'Failed to save invoice');
    }
  } catch (err) {
    console.error("Failed to save sale invoice:", err);
    alert("Failed to save invoice: " + err.message);
  }
}

// Add Purchase Item - UPDATED to show calculation
function addPurchaseItemToInvoice() {
  if (!isValidItem("purchaseItem", "purchaseItemsList")) return;

  const item = document.getElementById("purchaseItem").value.trim();
  const qtyEl = document.getElementById("purchaseQty");
  const priceEl = document.getElementById("purchasePrice");
  const qty = Number(qtyEl.value);
  const price = Number(priceEl.value);

  if (!item || qty <= 0) {
    alert("Please enter a valid quantity!");
    qtyEl.focus();
    return;
  }

  const subtotal = qty * price;
  tempPurchaseItems.push({ item, qty, price, subtotal });
  renderPurchaseInvoiceTable();

  document.getElementById("purchaseItem").value = "";
  qtyEl.value = "";
  priceEl.value = "";
  document.getElementById("purchaseItem").focus();
}

// Render purchase invoice table - UPDATED to show calculation
function renderPurchaseInvoiceTable() {
  const table = document.getElementById("purchaseInvoiceTable");
  let html = `<thead>
      <tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th><th>Action</th></tr>
    </thead><tbody>`;

  tempPurchaseItems.forEach((row, i) => {
    html += `<tr>
      <td>${escapeHtml(row.item)}</td>
      <td>${row.qty}</td>
      <td>₹${row.price.toFixed(2)}</td>
      <td>₹${row.subtotal.toFixed(2)}</td>
      <td><button onclick="removePurchaseItem(${i})">Remove</button></td>
    </tr>`;
  });

  const grandTotal = tempPurchaseItems.reduce((sum, item) => sum + item.subtotal, 0);
  html += `<tr style="font-weight: bold; background: #f0f0f0;">
    <td colspan="3" style="text-align: right;">Grand Total:</td>
    <td>₹${grandTotal.toFixed(2)}</td>
    <td></td>
  </tr>`;

  html += "</tbody>";
  if (table) table.innerHTML = html;
}

function removePurchaseItem(i) {
  tempPurchaseItems.splice(i, 1);
  renderPurchaseInvoiceTable();
}

// Save purchase invoice - UPDATED for subtotal
async function savePurchaseInvoice() {
  const partyEl = document.getElementById("purchaseParty");
  if (!partyEl) return alert("Party selector not found!");
  const party = partyEl.value;
  if (!party) {
    alert("Please select a Party!");
    partyEl.focus();
    return;
  }

  if (tempPurchaseItems.length === 0) {
    alert("Add at least one item!");
    return;
  }

  const date = formatDate();
  
  try {
    const result = await UniversalCORSHandler.callAPI('addPurchaseInvoice', {
      date: date,
      party: party,
      items: JSON.stringify(tempPurchaseItems)
    });

    if (result.success) {
      const invoiceId = result.id;
      const savedItems = [...tempPurchaseItems];
      tempPurchaseItems = [];
      renderPurchaseInvoiceTable();

      showInvoicePage(invoiceId, date, savedItems, "Purchase", party);
      alert("Purchase invoice saved successfully!");
    } else {
      throw new Error(result.error || 'Failed to save invoice');
    }
  } catch (err) {
    console.error("Failed to save purchase invoice:", err);
    alert("Failed to save invoice: " + err.message);
  }
}

// Show Invoice Page - UPDATED with proper history
function showInvoicePage(invoiceId, date, items, type, party = "") {
  console.log('showInvoicePage called for:', type, 'invoice', invoiceId);
  
  const container = document.getElementById("invoicePage");
  if (!container) return alert("Invoice container not found!");

  let grandTotal = 0;
  
  let html = `
    <div class="invoice-info" style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div>
          <h3 style="margin: 0 0 15px 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 8px;">Invoice Details</h3>
          <p style="margin: 8px 0;"><strong>Invoice ID:</strong> #${escapeHtml(String(invoiceId))}</p>
          <p style="margin: 8px 0;"><strong>Date:</strong> ${escapeHtml(date)}</p>
        </div>
        <div>
          <h3 style="margin: 0 0 15px 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 8px;">Party Details</h3>
          <p style="margin: 8px 0;"><strong>Party Name:</strong> ${escapeHtml(party || "N/A")}</p>
        </div>
      </div>
      
      <table width="100%" style="border-collapse: collapse;">
        <thead>
          <tr style="background: #34495e;">
            <th style="padding: 15px; color: white; text-align: left; border: none;">Item Description</th>
            <th style="padding: 15px; color: white; text-align: center; border: none;">Quantity</th>
            <th style="padding: 15px; color: white; text-align: right; border: none;">Unit Price</th>
            <th style="padding: 15px; color: white; text-align: right; border: none;">Amount</th>
          </tr>
        </thead>
        <tbody>`;

  items.forEach(r => {
    const subtotal = Number(r.subtotal) || (Number(r.qty) * Number(r.price));
    html += `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #ecf0f1;">${escapeHtml(r.item)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; text-align: center;">${r.qty}</td>
        <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; text-align: right;">₹${Number(r.price).toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; text-align: right;">₹${subtotal.toFixed(2)}</td>
      </tr>`;
    grandTotal += subtotal;
  });

  html += `
      <tr style="background: #f8f9fa;">
        <td colspan="3" style="padding: 15px; text-align: right; border: none; font-weight: bold; font-size: 16px;">Grand Total:</td>
        <td style="padding: 15px; text-align: right; border: none; font-weight: bold; font-size: 16px; color: #e74c3c;">₹${grandTotal.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>
</div>`;

  const headerTitle = container.querySelector('.header h1');
  if (headerTitle) {
    headerTitle.textContent = `${type} Invoice #${invoiceId}`;
  }

  const invoiceContent = document.getElementById("invoiceContent");
  if (invoiceContent) {
    invoiceContent.innerHTML = html;
  }

  showPage("invoicePage");
}

// Print Invoice - UPDATED (no new window)
function printInvoice() {
  const container = document.getElementById("invoiceContent");
  if (!container) return;

  const printableContent = container.cloneNode(true);
  
  const printStyle = `
    <style>
      @media print {
        body { 
          margin: 0;
          padding: 20px;
          font-family: Arial, sans-serif;
          color: #000;
        }
        .no-print { 
          display: none !important; 
        }
        .invoice-info { 
          border: 1px solid #000;
          padding: 20px;
          margin: 0;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 20px;
        }
        th { 
          background: #f0f0f0 !important; 
          color: #000 !important; 
          padding: 12px; 
          border: 1px solid #000;
          font-weight: bold;
        }
        td { 
          padding: 10px; 
          border: 1px solid #000; 
        }
        h3 {
          color: #000 !important;
          margin: 10px 0;
        }
        .header {
          display: none !important;
        }
      }
      @media screen {
        .print-only { 
          display: none; 
        }
      }
    </style>
  `;

  const printDiv = document.createElement('div');
  printDiv.innerHTML = printStyle + printableContent.innerHTML;
  
  const headerTitle = document.querySelector('#invoicePage .header h1').textContent;
  const printHeader = `<div class="print-header" style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
    <h1 style="margin: 0; font-size: 24px;">${headerTitle}</h1>
    <p style="margin: 5px 0; font-size: 12px;">Printed on: ${new Date().toLocaleDateString()}</p>
  </div>`;
  
  printDiv.innerHTML = printStyle + printHeader + printableContent.innerHTML;

  document.body.appendChild(printDiv);

  window.print();

  setTimeout(() => {
    document.body.removeChild(printDiv);
  }, 100);
}

async function downloadInvoicePDF() {
  const container = document.getElementById("invoicePage");
  if (!container) return;

  const element = container.cloneNode(true);
  element.querySelectorAll("#invoiceActions, button").forEach(btn => btn.remove());

  if (typeof html2pdf === "undefined") {
    await new Promise(resolve => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = resolve;
      document.body.appendChild(script);
    });
  }

  html2pdf().set({
    margin: 0.5,
    filename: `invoice_${new Date().getTime()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  }).from(element).save();
}

// Load Inventory - ENHANCED VERSION
async function loadInventory() {
  showPage("inventory");
  showInventoryLoading();

  try {
    const result = await UniversalCORSHandler.callAPI('getInventory');
    
    if (result.success) {
      const data = result.data || result;
      console.log("Inventory data:", data);
      window.allInventoryData = processInventoryData(data);
      renderInventoryTable(window.allInventoryData);
    } else {
      throw new Error(result.error || 'Failed to load inventory');
    }
    
  } catch (err) {
    console.error("Failed to load inventory:", err);
    showInventoryError("Failed to load inventory: " + err.message);
    showDemoData('inventory');
  }
}

// Process inventory data
function processInventoryData(data) {
  if (!Array.isArray(data) || data.length <= 1) {
    return [];
  }

  const rows = data.slice(1);
  const inventory = [];

  rows.forEach(row => {
    if (row.length >= 4) {
      const [id, name, price, stock] = row;
      inventory.push({
        id: id,
        name: name || "",
        price: Number(price) || 0,
        stock: Number(stock) || 0,
        totalValue: (Number(price) || 0) * (Number(stock) || 0)
      });
    }
  });

  return inventory.sort((a, b) => a.name.localeCompare(b.name));
}

// Render inventory table
function renderInventoryTable(inventoryData, filter = "") {
  const table = document.getElementById("inventoryTable");
  const summaryDiv = document.getElementById("inventorySummary");

  let totalItems = 0;
  let totalValue = 0;
  let lowStockCount = 0;
  
  let html = `<thead>
    <tr>
      <th>ID</th>
      <th>Item Name</th>
      <th>Price</th>
      <th>Stock</th>
      <th>Total Value</th>
      <th>Status</th>
    </tr>
  </thead><tbody>`;

  if (!inventoryData || inventoryData.length === 0) {
    html += `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #7f8c8d;">
      <div style="font-size: 18px; margin-bottom: 10px;">📦</div>
      No items in inventory
    </td></tr>`;
  } else {
    const searchLower = filter.toLowerCase();
    let filteredCount = 0;

    inventoryData.forEach(item => {
      const matchesFilter = !filter || 
        item.name.toLowerCase().includes(searchLower) ||
        item.id.toString().includes(searchLower);

      if (!matchesFilter) return;
      
      filteredCount++;
      totalItems++;
      totalValue += item.totalValue;
      
      if (item.stock < 10) {
        lowStockCount++;
      }

      const status = getStockStatus(item.stock);
      const statusColor = getStatusColor(item.stock);
      
      html += `<tr>
        <td style="text-align: center; font-weight: bold; color: #2c3e50;">${escapeHtml(item.id)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td style="text-align: right; color: #27ae60;">₹${item.price.toFixed(2)}</td>
        <td style="text-align: center; font-weight: bold; color: ${item.stock < 10 ? '#e74c3c' : '#27ae60'};">${item.stock}</td>
        <td style="text-align: right; font-weight: bold; color: #3498db;">₹${item.totalValue.toFixed(2)}</td>
        <td style="text-align: center;">
          <span style="padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; background: ${statusColor.background}; color: ${statusColor.text};">
            ${status}
          </span>
        </td>
      </tr>`;
    });

    if (filteredCount === 0 && filter) {
      html += `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #e74c3c;">
        <div style="font-size: 18px; margin-bottom: 10px;">🔍</div>
        No items match your search
      </td></tr>`;
    }
  }

  html += "</tbody>";
  if (table) table.innerHTML = html;
  
  if (summaryDiv) {
    const filterText = filter ? ` (${inventoryData.filter(item => {
      const searchLower = filter.toLowerCase();
      return item.name.toLowerCase().includes(searchLower) ||
             item.id.toString().includes(searchLower);
    }).length} items)` : ` (${inventoryData.length} items)`;
    
    let summaryHTML = `Total Items: ${totalItems}${filterText}`;
    
    if (totalValue > 0) {
      summaryHTML += ` • Total Value: ₹${totalValue.toFixed(2)}`;
    }
    
    if (lowStockCount > 0) {
      summaryHTML += ` • <span style="color: #e74c3c;">${lowStockCount} low stock</span>`;
    }
    
    summaryDiv.innerHTML = summaryHTML;
  }
}

// Filter inventory
function filterInventory() {
  const searchBox = document.getElementById('inventorySearch');
  const filter = searchBox ? searchBox.value.trim() : "";
  renderInventoryTable(window.allInventoryData, filter);
}

// Get stock status
function getStockStatus(stock) {
  if (stock === 0) return "Out of Stock";
  if (stock < 5) return "Very Low";
  if (stock < 10) return "Low Stock";
  if (stock < 20) return "Medium";
  return "In Stock";
}

// Get status color
function getStatusColor(stock) {
  if (stock === 0) return { background: '#e74c3c', text: 'white' };
  if (stock < 5) return { background: '#e67e22', text: 'white' };
  if (stock < 10) return { background: '#f39c12', text: 'white' };
  if (stock < 20) return { background: '#3498db', text: 'white' };
  return { background: '#27ae60', text: 'white' };
}

// Show loading state for inventory
function showInventoryLoading() {
  const table = document.getElementById("inventoryTable");
  if (table) {
    table.innerHTML = `
      <thead>
        <tr><th>ID</th><th>Item Name</th><th>Price</th><th>Stock</th><th>Total Value</th><th>Status</th></tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px;">
            <div style="display: inline-block; animation: spin 1s linear infinite;">🔄</div>
            <div style="margin-top: 10px;">Loading inventory...</div>
          </td>
        </tr>
      </tbody>`;
  }
  
  const summaryDiv = document.getElementById("inventorySummary");
  if (summaryDiv) {
    summaryDiv.innerHTML = "Loading...";
  }
}

// Show error for inventory
function showInventoryError(message) {
  const table = document.getElementById("inventoryTable");
  if (table) {
    table.innerHTML = `
      <thead>
        <tr><th>ID</th><th>Item Name</th><th>Price</th><th>Stock</th><th>Total Value</th><th>Status</th></tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="6" style="text-align: center; color: #e74c3c; padding: 30px; background: #fdf2f2;">
            <div style="font-size: 16px; margin-bottom: 10px;">⚠️ ${message}</div>
            <button onclick="loadInventory()" style="padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Try Again
            </button>
          </td>
        </tr>
      </tbody>`;
  }
}

// Back Navigation History - FIXED VERSION
let pageHistory = [];

// Go back to previous page - FIXED
function goBackToPreviousPage() {
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
      showPage('dashboard');
    }
  } else {
    console.log('No history, going to dashboard');
    showPage('dashboard');
  }
}

// Clear history and go to dashboard
function goToDashboard() {
  pageHistory = [];
  showPage('dashboard');
}

// Enter key shortcuts
const salePriceEl = document.getElementById("salePrice");
if (salePriceEl) salePriceEl.addEventListener("keypress", e => { if (e.key === "Enter") addSaleItemToInvoice(); });
const purchasePriceEl = document.getElementById("purchasePrice");
if (purchasePriceEl) purchasePriceEl.addEventListener("keypress", e => { if (e.key === "Enter") addPurchaseItemToInvoice(); });

// Date Formatter
function formatDate(date = new Date()) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// small util: escape html
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// =====================
// Load Sales - COMPLETE FUNCTION
// =====================
async function loadSales() {
  showPage("sales");
  showSalesLoading();

  try {
    const result = await UniversalCORSHandler.callAPI('getSales');
    
    if (result.success) {
      const data = result.data || result;
      console.log("Sales data:", data);
      window.allSalesData = processSalesData(data);
      renderSalesTable(window.allSalesData);
    } else {
      throw new Error(result.error || 'Failed to load sales');
    }
    
  } catch (err) {
    console.error("Failed to load sales:", err);
    showSalesError("Failed to load sales: " + err.message);
    showDemoData('sales');
  }
}


// =====================
// Load Purchases - COMPLETE FUNCTION
// =====================
async function loadPurchases() {
  showPage("purchases");
  showPurchasesLoading();

  try {
    const result = await UniversalCORSHandler.callAPI('getPurchases');
    
    if (result.success) {
      const data = result.data || result;
      console.log("Purchases data:", data);
      window.allPurchasesData = processPurchasesData(data);
      renderPurchasesTable(window.allPurchasesData);
    } else {
      throw new Error(result.error || 'Failed to load purchases');
    }
    
  } catch (err) {
    console.error("Failed to load purchases:", err);
    showError("Failed to load purchases: " + err.message);
    showDemoData('purchases');
  }
}

// =====================
// Helper Functions for Sales
// =====================

// Process sales data and group by invoice
function processSalesData(data) {
  if (!Array.isArray(data) || data.length <= 1) {
    return [];
  }

  const rows = data.slice(1); // skip header
  const invoices = {};

  rows.forEach(r => {
    if (r.length >= 7) {
      // [id, date, party, itemName, qty, price, total]
      const [id, date, party, itemName, qty, price, totalStr] = r;
      if (!invoices[id]) {
        invoices[id] = {
          invoiceId: id,
          date: date,
          party: party || "",
          items: [],
          total: 0
        };
      }
      const itemTotal = Number(totalStr) || (Number(qty) * Number(price) || 0);
      invoices[id].items.push({
        item: itemName,
        qty: Number(qty) || 0,
        price: Number(price) || 0,
        total: itemTotal
      });
      invoices[id].total += itemTotal;
    }
  });

  // Convert to array and sort by invoice ID (newest first)
  return Object.values(invoices).sort((a, b) => b.invoiceId - a.invoiceId);
}

// Render sales table
function renderSalesTable(salesData, filter = "") {
  const table = document.getElementById("salesTable");
  const totalDiv = document.getElementById("salesGrandTotal");

  let grandTotal = 0;
  let html = `<thead>
    <tr>
      <th>Date</th>
      <th>Invoice ID</th>
      <th>Party Name</th>
      <th>Total Amount</th>
    </tr>
  </thead><tbody>`;

  if (!salesData || salesData.length === 0) {
    html += `<tr><td colspan="4" style="text-align: center; padding: 40px; color: #7f8c8d;">
      <div style="font-size: 18px; margin-bottom: 10px;">📭</div>
      No sales found
    </td></tr>`;
  } else {
    const searchLower = filter.toLowerCase();
    let filteredCount = 0;

    salesData.forEach(sale => {
      // Apply filter
      const matchesFilter = !filter || 
        sale.party.toLowerCase().includes(searchLower) ||
        sale.invoiceId.toString().includes(searchLower) ||
        sale.date.toLowerCase().includes(searchLower);

      if (!matchesFilter) return;
      
      filteredCount++;
      grandTotal += sale.total;

      html += `<tr class="sale-row" data-invoice-id="${sale.invoiceId}" 
                style="cursor: pointer; transition: background-color 0.2s;"
                onmouseover="this.style.backgroundColor='#f8f9fa'" 
                onmouseout="this.style.backgroundColor='white'"
                onclick="showSaleInvoice('${sale.invoiceId}')">
        <td>${escapeHtml(sale.date)}</td>
        <td style="text-align: center; font-weight: bold; color: #2c3e50;">${escapeHtml(sale.invoiceId)}</td>
        <td>${escapeHtml(sale.party || "N/A")}</td>
        <td style="text-align: right; font-weight: bold; color: #e74c3c;">₹${sale.total.toFixed(2)}</td>
      </tr>`;
    });

    if (filteredCount === 0 && filter) {
      html += `<tr><td colspan="4" style="text-align: center; padding: 40px; color: #e74c3c;">
        <div style="font-size: 18px; margin-bottom: 10px;">🔍</div>
        No sales match your search
      </td></tr>`;
    }
  }

  html += "</tbody>";
  if (table) table.innerHTML = html;
  
  // Update total at the top
  if (totalDiv) {
    const filterText = filter ? ` (${salesData.filter(s => {
      const searchLower = filter.toLowerCase();
      return s.party.toLowerCase().includes(searchLower) ||
             s.invoiceId.toString().includes(searchLower) ||
             s.date.toLowerCase().includes(searchLower);
    }).length} records)` : ` (${salesData.length} records)`;
    
    totalDiv.innerHTML = `Total Sales: ₹${grandTotal.toFixed(2)}${filterText}`;
  }

  // Add click event listeners to all rows
  setTimeout(() => {
    document.querySelectorAll('.sale-row').forEach(row => {
      row.addEventListener('click', function() {
        const invoiceId = this.getAttribute('data-invoice-id');
        showSaleInvoice(invoiceId);
      });
    });
  }, 100);
}

// Show sale invoice details
function showSaleInvoice(invoiceId) {
  if (!window.allSalesData) {
    alert("Sales data not loaded. Please refresh and try again.");
    return;
  }

  const sale = window.allSalesData.find(s => s.invoiceId == invoiceId);
  if (!sale) {
    alert("Sales invoice not found!");
    return;
  }

  console.log('Showing sale invoice, adding to history');
  
  // Show the invoice page with sale details
  showInvoicePage(
    sale.invoiceId,
    sale.date,
    sale.items,
    "Sale",
    sale.party
  );
}

// Show loading state for sales
function showSalesLoading() {
  const table = document.getElementById("salesTable");
  if (table) {
    table.innerHTML = `
      <thead>
        <tr><th>Date</th><th>Invoice ID</th><th>Party Name</th><th>Total Amount</th></tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="4" style="text-align: center; padding: 40px;">
            <div style="display: inline-block; animation: spin 1s linear infinite;">🔄</div>
            <div style="margin-top: 10px;">Loading sales...</div>
          </td>
        </tr>
      </tbody>`;
  }
  
  const totalDiv = document.getElementById("salesGrandTotal");
  if (totalDiv) {
    totalDiv.innerHTML = "Loading...";
  }
}

// Helper function for sales errors
function showSalesError(message) {
  const table = document.getElementById("salesTable");
  if (table) {
    table.innerHTML = `
      <thead>
        <tr><th>Date</th><th>Invoice ID</th><th>Party Name</th><th>Total Amount</th></tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="4" style="text-align: center; color: #e74c3c; padding: 30px; background: #fdf2f2;">
            <div style="font-size: 16px; margin-bottom: 10px;">⚠️ ${message}</div>
            <button onclick="loadSales()" style="padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Try Again
            </button>
          </td>
        </tr>
      </tbody>`;
  }
}

// =====================
// Helper Functions for Purchases
// =====================

// Process purchases data and group by invoice
function processPurchasesData(data) {
  if (!Array.isArray(data) || data.length <= 1) {
    return [];
  }

  const rows = data.slice(1); // skip header
  const invoices = {};

  rows.forEach(r => {
    if (r.length >= 7) {
      // [id, date, party, itemName, qty, price, total]
      const [id, date, party, itemName, qty, price, totalStr] = r;
      if (!invoices[id]) {
        invoices[id] = {
          invoiceId: id,
          date: date,
          party: party || "",
          items: [],
          total: 0
        };
      }
      const itemTotal = Number(totalStr) || (Number(qty) * Number(price) || 0);
      invoices[id].items.push({
        item: itemName,
        qty: Number(qty) || 0,
        price: Number(price) || 0,
        total: itemTotal
      });
      invoices[id].total += itemTotal;
    }
  });

  // Convert to array and sort by invoice ID (newest first)
  return Object.values(invoices).sort((a, b) => b.invoiceId - a.invoiceId);
}

// Render purchases table
function renderPurchasesTable(purchasesData, filter = "") {
  const table = document.getElementById("purchasesTable");
  const totalDiv = document.getElementById("purchasesGrandTotal");

  let grandTotal = 0;
  let html = `<thead>
    <tr>
      <th>Date</th>
      <th>Invoice ID</th>
      <th>Party Name</th>
      <th>Total Amount</th>
    </tr>
  </thead><tbody>`;

  if (!purchasesData || purchasesData.length === 0) {
    html += `<tr><td colspan="4" style="text-align: center; padding: 40px; color: #7f8c8d;">
      <div style="font-size: 18px; margin-bottom: 10px;">📭</div>
      No purchases found
    </td></tr>`;
  } else {
    const searchLower = filter.toLowerCase();
    let filteredCount = 0;

    purchasesData.forEach(purchase => {
      // Apply filter
      const matchesFilter = !filter || 
        purchase.party.toLowerCase().includes(searchLower) ||
        purchase.invoiceId.toString().includes(searchLower) ||
        purchase.date.toLowerCase().includes(searchLower);

      if (!matchesFilter) return;
      
      filteredCount++;
      grandTotal += purchase.total;

      html += `<tr class="purchase-row" data-invoice-id="${purchase.invoiceId}" 
                style="cursor: pointer; transition: background-color 0.2s;"
                onmouseover="this.style.backgroundColor='#f8f9fa'" 
                onmouseout="this.style.backgroundColor='white'"
                onclick="showPurchaseInvoice('${purchase.invoiceId}')">
        <td>${escapeHtml(purchase.date)}</td>
        <td style="text-align: center; font-weight: bold; color: #2c3e50;">${escapeHtml(purchase.invoiceId)}</td>
        <td>${escapeHtml(purchase.party || "N/A")}</td>
        <td style="text-align: right; font-weight: bold; color: #27ae60;">₹${purchase.total.toFixed(2)}</td>
      </tr>`;
    });

    if (filteredCount === 0 && filter) {
      html += `<tr><td colspan="4" style="text-align: center; padding: 40px; color: #e74c3c;">
        <div style="font-size: 18px; margin-bottom: 10px;">🔍</div>
        No purchases match your search
      </td></tr>`;
    }
  }

  html += "</tbody>";
  if (table) table.innerHTML = html;
  
  // Update total at the top
  if (totalDiv) {
    const filterText = filter ? ` (${purchasesData.filter(p => {
      const searchLower = filter.toLowerCase();
      return p.party.toLowerCase().includes(searchLower) ||
             p.invoiceId.toString().includes(searchLower) ||
             p.date.toLowerCase().includes(searchLower);
    }).length} records)` : ` (${purchasesData.length} records)`;
    
    totalDiv.innerHTML = `Total Purchase: ₹${grandTotal.toFixed(2)}${filterText}`;
  }

  // Add click event listeners to all rows
  setTimeout(() => {
    document.querySelectorAll('.purchase-row').forEach(row => {
      row.addEventListener('click', function() {
        const invoiceId = this.getAttribute('data-invoice-id');
        showPurchaseInvoice(invoiceId);
      });
    });
  }, 100);
}

// Show purchase invoice details
function showPurchaseInvoice(invoiceId) {
  if (!window.allPurchasesData) {
    alert("Purchase data not loaded. Please refresh and try again.");
    return;
  }

  const purchase = window.allPurchasesData.find(p => p.invoiceId == invoiceId);
  if (!purchase) {
    alert("Purchase invoice not found!");
    return;
  }

  console.log('Showing purchase invoice, adding to history');
  
  // Show the invoice page with purchase details
  showInvoicePage(
    purchase.invoiceId,
    purchase.date,
    purchase.items,
    "Purchase",
    purchase.party
  );
}

// Show loading state for purchases
function showPurchasesLoading() {
  const table = document.getElementById("purchasesTable");
  if (table) {
    table.innerHTML = `
      <thead>
        <tr><th>Date</th><th>Invoice ID</th><th>Party Name</th><th>Total Amount</th></tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="4" style="text-align: center; padding: 40px;">
            <div style="display: inline-block; animation: spin 1s linear infinite;">🔄</div>
            <div style="margin-top: 10px;">Loading purchases...</div>
          </td>
        </tr>
      </tbody>`;
  }
  
  const totalDiv = document.getElementById("purchasesGrandTotal");
  if (totalDiv) {
    totalDiv.innerHTML = "Loading...";
  }
}

// Helper function to show errors
function showError(message) {
  const table = document.getElementById("purchasesTable");
  if (table) {
    table.innerHTML = `
      <thead>
        <tr><th>Date</th><th>Invoice ID</th><th>Party Name</th><th>Total Amount</th></tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="4" style="text-align: center; color: #e74c3c; padding: 30px; background: #fdf2f2;">
            <div style="font-size: 16px; margin-bottom: 10px;">⚠️ ${message}</div>
            <button onclick="loadPurchases()" style="padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Try Again
            </button>
          </td>
        </tr>
      </tbody>`;
  }
}

// =====================
// Date Range Filter Functions
// =====================

// Filter by date range
function filterByDateRange() {
  const dateRange = document.getElementById('dateRangeFilter').value;
  const customDateRange = document.getElementById('customDateRange');
  
  // Show/hide custom date range inputs
  if (dateRange === 'custom') {
    customDateRange.style.display = 'flex';
  } else {
    customDateRange.style.display = 'none';
    applyDateFilter(dateRange);
  }
}

// Apply date filter based on selected range
function applyDateFilter(range) {
  if (!window.allPurchasesData) return;
  
  const now = new Date();
  let filteredData = [...window.allPurchasesData];
  
  switch (range) {
    case 'today':
      filteredData = filteredData.filter(purchase => isSameDay(new Date(purchase.date), now));
      break;
      
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      filteredData = filteredData.filter(purchase => isSameDay(new Date(purchase.date), yesterday));
      break;
      
    case 'thisWeek':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      filteredData = filteredData.filter(purchase => new Date(purchase.date) >= startOfWeek);
      break;
      
    case 'lastWeek':
      const startOfLastWeek = new Date(now);
      startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      endOfLastWeek.setHours(23, 59, 59, 999);
      filteredData = filteredData.filter(purchase => {
        const purchaseDate = new Date(purchase.date);
        return purchaseDate >= startOfLastWeek && purchaseDate <= endOfLastWeek;
      });
      break;
      
    case 'thisMonth':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filteredData = filteredData.filter(purchase => new Date(purchase.date) >= startOfMonth);
      break;
      
    case 'lastMonth':
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      endOfLastMonth.setHours(23, 59, 59, 999);
      filteredData = filteredData.filter(purchase => {
        const purchaseDate = new Date(purchase.date);
        return purchaseDate >= startOfLastMonth && purchaseDate <= endOfLastMonth;
      });
      break;
      
    case 'thisYear':
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      filteredData = filteredData.filter(purchase => new Date(purchase.date) >= startOfYear);
      break;
      
    case 'lastYear':
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
      endOfLastYear.setHours(23, 59, 59, 999);
      filteredData = filteredData.filter(purchase => {
        const purchaseDate = new Date(purchase.date);
        return purchaseDate >= startOfLastYear && purchaseDate <= endOfLastYear;
      });
      break;
      
    case 'all':
    default:
      // Show all data
      break;
  }
  
  const searchText = document.getElementById('purchasesSearch').value;
  renderPurchasesTable(filteredData, searchText);
}

// Apply custom date range
function applyCustomDateRange() {
  const fromDate = document.getElementById('customDateFrom').value;
  const toDate = document.getElementById('customDateTo').value;
  
  if (!fromDate || !toDate) {
    alert('Please select both start and end dates');
    return;
  }
  
  if (!window.allPurchasesData) return;
  
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  endDate.setHours(23, 59, 59, 999);
  
  const filteredData = window.allPurchasesData.filter(purchase => {
    const purchaseDate = new Date(purchase.date);
    return purchaseDate >= startDate && purchaseDate <= endDate;
  });
  
  const searchText = document.getElementById('purchasesSearch').value;
  renderPurchasesTable(filteredData, searchText);
}

// Sales Date Range Filter Functions
function filterSalesByDateRange() {
  const dateRange = document.getElementById('salesDateRangeFilter').value;
  const customDateRange = document.getElementById('salesCustomDateRange');
  
  if (dateRange === 'custom') {
    customDateRange.style.display = 'flex';
  } else {
    customDateRange.style.display = 'none';
    applySalesDateFilter(dateRange);
  }
}

function applySalesDateFilter(range) {
  if (!window.allSalesData) return;
  
  const now = new Date();
  let filteredData = [...window.allSalesData];
  
  switch (range) {
    case 'today':
      filteredData = filteredData.filter(sale => isSameDay(new Date(sale.date), now));
      break;
      
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      filteredData = filteredData.filter(sale => isSameDay(new Date(sale.date), yesterday));
      break;
      
    case 'thisWeek':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      filteredData = filteredData.filter(sale => new Date(sale.date) >= startOfWeek);
      break;
      
    case 'lastWeek':
      const startOfLastWeek = new Date(now);
      startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      endOfLastWeek.setHours(23, 59, 59, 999);
      filteredData = filteredData.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startOfLastWeek && saleDate <= endOfLastWeek;
      });
      break;
      
    case 'thisMonth':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filteredData = filteredData.filter(sale => new Date(sale.date) >= startOfMonth);
      break;
      
    case 'lastMonth':
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      endOfLastMonth.setHours(23, 59, 59, 999);
      filteredData = filteredData.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startOfLastMonth && saleDate <= endOfLastMonth;
      });
      break;
      
    case 'thisYear':
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      filteredData = filteredData.filter(sale => new Date(sale.date) >= startOfYear);
      break;
      
    case 'lastYear':
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
      endOfLastYear.setHours(23, 59, 59, 999);
      filteredData = filteredData.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startOfLastYear && saleDate <= endOfLastYear;
      });
      break;
      
    case 'all':
    default:
      // Show all data
      break;
  }
  
  const searchText = document.getElementById('salesSearch').value;
  renderSalesTable(filteredData, searchText);
}

function applySalesCustomDateRange() {
  const fromDate = document.getElementById('salesCustomDateFrom').value;
  const toDate = document.getElementById('salesCustomDateTo').value;
  
  if (!fromDate || !toDate) {
    alert('Please select both start and end dates');
    return;
  }
  
  if (!window.allSalesData) return;
  
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  endDate.setHours(23, 59, 59, 999);
  
  const filteredData = window.allSalesData.filter(sale => {
    const saleDate = new Date(sale.date);
    return saleDate >= startDate && saleDate <= endDate;
  });
  
  const searchText = document.getElementById('salesSearch').value;
  renderSalesTable(filteredData, searchText);
}

// Filter sales by search text
function filterSales() {
  const searchBox = document.getElementById('salesSearch');
  const filter = searchBox ? searchBox.value.trim() : "";
  renderSalesTable(window.allSalesData, filter);
}

// Filter purchases
function filterPurchases() {
  const searchBox = document.getElementById("purchasesSearch");
  const filter = searchBox ? searchBox.value.trim() : "";
  renderPurchasesTable(window.allPurchasesData, filter);
}

// Helper function to check if two dates are the same day
function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

// Format date for input fields (YYYY-MM-DD)
function formatDateForInput(date) {
  return date.toISOString().split('T')[0];
}

// Initialize date inputs with current date range
function initializeDateInputs() {
  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);
  
  document.getElementById('customDateFrom').value = formatDateForInput(oneWeekAgo);
  document.getElementById('customDateTo').value = formatDateForInput(today);
}

// Initialize sales date inputs
function initializeSalesDateInputs() {
  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);
  
  document.getElementById('salesCustomDateFrom').value = formatDateForInput(oneWeekAgo);
  document.getElementById('salesCustomDateTo').value = formatDateForInput(today);
}