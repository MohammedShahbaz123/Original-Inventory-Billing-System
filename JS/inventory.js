// =====================
// INVENTORY MANAGEMENT
// =====================

// Global variables
window.allInventoryData = [];

// Main Inventory Functions
async function loadInventory() {
     Navigation.showPage("inventory");
    showInventoryLoading();

    try {
        console.log("🔄 Loading inventory...");
        const result = await UniversalCORSHandler.callAPI('getInventory');
        
        if (result.success) {
            const data = result.data || result;
            console.log("✅ Inventory data loaded:", data);
            window.allInventoryData = processInventoryData(data);
            renderInventoryTable(window.allInventoryData);
        } else {
            throw new Error(result.error || 'Failed to load inventory');
        }
        
    } catch (err) {
        console.error("Failed to load inventory:", err);
        showInventoryError("Failed to load inventory: " + err.message);
        showDemoInventory();
    }
}

async function addItem() {
    const name = document.getElementById("itemName").value.trim();
    const price = Number(document.getElementById("itemPrice").value);
    const stock = Number(document.getElementById("itemStock").value);

    if (!name || price <= 0 || stock < 0) {
        alert("Please enter valid item details!\n\n• Name cannot be empty\n• Price must be greater than 0\n• Stock cannot be negative");
        return;
    }

    try {
        showInventoryMessage("Adding item...", "info");
        
        const result = await UniversalCORSHandler.callAPI('addItem', {
            name: name,
            price: price,
            stock: stock
        });

        if (result.success) {
            showInventoryMessage("Item added successfully!", "success");
            document.getElementById("itemName").value = "";
            document.getElementById("itemPrice").value = "";
            document.getElementById("itemStock").value = "";
            
            // Reload inventory and dropdowns
            loadInventory();
            loadItemsDropdown();
        } else {
            throw new Error(result.error || 'Failed to add item');
        }
    } catch (err) {
        console.error("Failed to add item:", err);
        showInventoryError("Failed to add item: " + err.message);
    }
}

// Load Items into Dropdowns (used in sales/purchase invoices)
async function loadItemsDropdown() {
    try {
        const result = await UniversalCORSHandler.callAPI('getInventory');
        const data = result.data || result;
        const items = (Array.isArray(data) && data.length > 1) ? data.slice(1).map(row => row[1]) : [];

        const saleList = document.getElementById("saleItemsList");
        const purchaseList = document.getElementById("purchaseItemsList");

        if (saleList) saleList.innerHTML = "";
        if (purchaseList) purchaseList.innerHTML = "";

        items.forEach(item => {
            if (saleList) saleList.appendChild(new Option(item, item));
            if (purchaseList) purchaseList.appendChild(new Option(item, item));
        });

        // Clear selected values
        const saleItemEl = document.getElementById("saleItem");
        const purchaseItemEl = document.getElementById("purchaseItem");
        if (saleItemEl) saleItemEl.value = "";
        if (purchaseItemEl) purchaseItemEl.value = "";
        
    } catch (err) {
        console.error("Failed to load items dropdown:", err);
        // Continue silently - dropdowns will be empty
    }
}

// Validate Item Input with focus
function isValidItem(inputId, listId) {
    const inputEl = document.getElementById(inputId);
    if (!inputEl) return false;
    const input = inputEl.value.trim();
    const list = document.getElementById(listId);
    if (!list || list.options.length === 0) return true; // No validation if no list

    const options = Array.from(list.options).map(opt => opt.value);

    if (!options.includes(input)) {
        UIUtils.showNotification("Please select a valid item from the list!", "error");
        inputEl.focus();
        inputEl.select();
        return false;
    }
    return true;
}

// Filter Inventory
function filterInventory() {
    const searchBox = document.getElementById('inventorySearch');
    const filter = searchBox ? searchBox.value.trim() : "";
    renderInventoryTable(window.allInventoryData, filter);
}

// Clear Inventory Filter
function clearInventoryFilter() {
    const searchBox = document.getElementById('inventorySearch');
    if (searchBox) {
        searchBox.value = "";
    }
    renderInventoryTable(window.allInventoryData);
}

// =====================
// INVENTORY DATA PROCESSING
// =====================

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
    let outOfStockCount = 0;
    
    let html = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Item Name</th>
                <th>Price (₹)</th>
                <th>Stock</th>
                <th>Total Value (₹)</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>`;

    if (!inventoryData || inventoryData.length === 0) {
        html += `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <div style="font-size: 18px; margin-bottom: 10px;">📦</div>
                    No items in inventory
                </td>
            </tr>`;
    } else {
        const searchLower = filter.toLowerCase();
        let filteredCount = 0;

        inventoryData.forEach(item => {
            // Apply filter
            const matchesFilter = !filter || 
                item.name.toLowerCase().includes(searchLower) ||
                item.id.toString().includes(searchLower);

            if (!matchesFilter) return;
            
            filteredCount++;
            totalItems++;
            totalValue += item.totalValue;
            
            if (item.stock === 0) {
                outOfStockCount++;
            } else if (item.stock < 10) {
                lowStockCount++;
            }

            const status = getStockStatus(item.stock);
            const statusColor = getStatusColor(item.stock);
            
            html += `
                <tr>
                    <td style="text-align: center; font-weight: bold; color: #2c3e50;">${Security.escapeHtml(item.id)}</td>
                    <td>${Security.escapeHtml(item.name)}</td>
                    <td style="text-align: right; color: #27ae60; font-weight: 500;">₹${item.price.toFixed(2)}</td>
                    <td style="text-align: center; font-weight: bold; color: ${getStockColor(item.stock)};">${item.stock}</td>
                    <td style="text-align: right; font-weight: bold; color: #3498db;">₹${item.totalValue.toFixed(2)}</td>
                    <td style="text-align: center;">
                        <span style="padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; background: ${statusColor.background}; color: ${statusColor.text};">
                            ${status}
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <button onclick="editInventoryItem('${Security.escapeHtml(item.id)}', '${Security.escapeHtml(item.name)}', ${item.price}, ${item.stock})" class="edit-item-btn" title="Edit Item">
                            ✏️
                        </button>
                        <button onclick="deleteInventoryItem('${Security.escapeHtml(item.id)}', '${Security.escapeHtml(item.name)}')" class="delete-item-btn" title="Delete Item">
                            🗑️
                        </button>
                    </td>
                </tr>`;
        });

        if (filteredCount === 0 && filter) {
            html += `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #e74c3c;">
                        <div style="font-size: 18px; margin-bottom: 10px;">🔍</div>
                        No items match your search
                    </td>
                </tr>`;
        }
    }

    html += "</tbody>";
    if (table) table.innerHTML = html;
    
    // Update summary at the top
    if (summaryDiv) {
        const filterText = filter ? ` (${filteredCount} items)` : ` (${inventoryData.length} items)`;
        
        let summaryHTML = `
            <div class="inventory-stats">
                <div class="stat-item">
                    <span class="stat-label">Total Items:</span>
                    <span class="stat-value">${totalItems}${filterText}</span>
                </div>`;
        
        if (totalValue > 0) {
            summaryHTML += `
                <div class="stat-item">
                    <span class="stat-label">Total Value:</span>
                    <span class="stat-value" style="color: #27ae60;">₹${totalValue.toFixed(2)}</span>
                </div>`;
        }
        
        if (lowStockCount > 0) {
            summaryHTML += `
                <div class="stat-item">
                    <span class="stat-label">Low Stock:</span>
                    <span class="stat-value" style="color: #e67e22;">${lowStockCount} items</span>
                </div>`;
        }
        
        if (outOfStockCount > 0) {
            summaryHTML += `
                <div class="stat-item">
                    <span class="stat-label">Out of Stock:</span>
                    <span class="stat-value" style="color: #e74c3c;">${outOfStockCount} items</span>
                </div>`;
        }
        
        summaryHTML += `</div>`;
        summaryDiv.innerHTML = summaryHTML;
    }
}

// =====================
// INVENTORY ACTIONS
// =====================

// Edit Inventory Item
function editInventoryItem(id, name, price, stock) {
    const newName = prompt("Edit item name:", name);
    if (newName === null) return; // User cancelled
    
    const newPrice = prompt("Edit item price (₹):", price);
    if (newPrice === null) return;
    
    const newStock = prompt("Edit item stock:", stock);
    if (newStock === null) return;
    
    if (newName && newName.trim() && !isNaN(newPrice) && !isNaN(newStock)) {
        updateInventoryItem(id, newName.trim(), Number(newPrice), Number(newStock));
    } else {
        alert("Please enter valid values for all fields!");
    }
}

// Update Inventory Item
async function updateInventoryItem(id, name, price, stock) {
    try {
        showInventoryMessage("Updating item...", "info");
        
        // Note: You'll need to add updateItem action to your Google Apps Script
        const result = await UniversalCORSHandler.callAPI('updateItem', {
            id: id,
            name: name,
            price: price,
            stock: stock
        });

        if (result.success) {
            showInventoryMessage("Item updated successfully!", "success");
            loadInventory(); // Reload the inventory
        } else {
            throw new Error(result.error || 'Failed to update item');
        }
        
    } catch (err) {
        console.error("Failed to update item:", err);
        showInventoryError("Failed to update item: " + err.message);
    }
}

// Delete Inventory Item
async function deleteInventoryItem(id, name) {
    if (!confirm(`Are you sure you want to delete the item "${name}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        showInventoryMessage("Deleting item...", "info");
        
        // Note: You'll need to add deleteItem action to your Google Apps Script
        const result = await UniversalCORSHandler.callAPI('deleteItem', {
            id: id
        });

        if (result.success) {
            showInventoryMessage(`Item "${name}" deleted successfully!`, "success");
            loadInventory(); // Reload the inventory
        } else {
            throw new Error(result.error || 'Failed to delete item');
        }
        
    } catch (err) {
        console.error("Failed to delete item:", err);
        showInventoryError("Failed to delete item: " + err.message);
    }
}

// =====================
// INVENTORY UI HELPERS
// =====================

// Show loading state for inventory
function showInventoryLoading() {
    const table = document.getElementById("inventoryTable");
    const summaryDiv = document.getElementById("inventorySummary");

    if (table) {
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Item Name</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Total Value</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <div class="loading-spinner">🔄</div>
                        <div style="margin-top: 10px;">Loading inventory...</div>
                    </td>
                </tr>
            </tbody>`;
    }
    
    if (summaryDiv) {
        summaryDiv.innerHTML = `<div class="inventory-stats"><div class="stat-item">Loading...</div></div>`;
    }
}

// Show demo inventory data
function showDemoInventory() {
    console.log("Showing demo inventory data");
    
    const demoData = [
        [1, "Sample Item 1", 100, 50],
        [2, "Sample Item 2", 200, 25],
        [3, "Sample Item 3", 150, 30],
        [4, "Sample Item 4", 75, 0],  // Out of stock
        [5, "Sample Item 5", 300, 5]   // Low stock
    ];
    
    window.allInventoryData = processInventoryData(demoData);
    renderInventoryTable(window.allInventoryData);
    showInventoryMessage("⚠️ Using demo data - Connection issue", "info");
}

// Show inventory message
function showInventoryMessage(message, type = "info") {
    // Remove existing message
    const existingMessage = document.querySelector('.inventory-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `inventory-message inventory-message-${type}`;
    messageDiv.innerHTML = `
        <span class="message-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="message-text">${message}</span>
        <button onclick="this.parentElement.remove()" class="message-close">×</button>
    `;

    const container = document.getElementById("inventory");
    if (container) {
        const header = container.querySelector('.header');
        if (header) {
            container.insertBefore(messageDiv, header.nextSibling);
        } else {
            container.insertBefore(messageDiv, container.firstChild);
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

// Show inventory error
function showInventoryError(message) {
    showInventoryMessage(message, "error");
}

// =====================
// INVENTORY UTILITIES
// =====================

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

// Get stock color for numbers
function getStockColor(stock) {
    if (stock === 0) return '#e74c3c';
    if (stock < 10) return '#e67e22';
    return '#27ae60';
}

// Export inventory data
function exportInventory() {
    if (!window.allInventoryData || window.allInventoryData.length === 0) {
        alert("No inventory data to export!");
        return;
    }

    let csvContent = "ID,Item Name,Price,Stock,Total Value,Status\n";
    
    window.allInventoryData.forEach(item => {
        const status = getStockStatus(item.stock);
        const row = [
            item.id,
            `"${item.name}"`,
            item.price.toFixed(2),
            item.stock,
            item.totalValue.toFixed(2),
            status
        ].join(',');
        
        csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_${formatDateForExport()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showInventoryMessage("Inventory exported successfully!", "success");
}

// Format date for export
function formatDateForExport() {
    const now = new Date();
    return now.toISOString().slice(0, 10).replace(/-/g, '');
}

// Print inventory
function printInventory() {
    const inventoryContent = document.getElementById("inventory");
    if (!inventoryContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Inventory Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #34495e; color: white; }
                tr:nth-child(even) { background-color: #f8f9fa; }
                .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                .timestamp { color: #7f8c8d; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <h1>📦 Inventory Report</h1>
            <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>
            ${inventoryContent.innerHTML}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

// =====================
// INVENTORY STYLES
// =====================

function addInventoryStyles() {
    if (document.querySelector('style[data-inventory-styles]')) return;
    
    const styles = `
        .inventory-stats {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        
        .stat-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .stat-label {
            font-size: 12px;
            color: #6c757d;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .stat-value {
            font-size: 16px;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .inventory-message {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 15px;
            margin-bottom: 20px;
            border-radius: 8px;
            font-weight: 500;
            animation: slideDown 0.3s ease;
        }
        
        .inventory-message-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .inventory-message-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .inventory-message-info {
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
        
        .edit-item-btn, .delete-item-btn {
            background: none;
            border: none;
            padding: 6px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
            margin: 0 2px;
        }
        
        .edit-item-btn:hover {
            background: #3498db;
            color: white;
        }
        
        .delete-item-btn:hover {
            background: #e74c3c;
            color: white;
        }
        
        .loading-spinner {
            display: inline-block;
            animation: spin 1s linear infinite;
            font-size: 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
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
        
        .inventory-actions {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .export-btn, .print-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .export-btn {
            background: #27ae60;
            color: white;
        }
        
        .export-btn:hover {
            background: #219a52;
            transform: translateY(-1px);
        }
        
        .print-btn {
            background: #3498db;
            color: white;
        }
        
        .print-btn:hover {
            background: #2980b9;
            transform: translateY(-1px);
        }
        
        @media (max-width: 768px) {
            .inventory-stats {
                flex-direction: column;
                gap: 10px;
            }
            
            .inventory-actions {
                flex-direction: column;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.setAttribute('data-inventory-styles', 'true');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// =====================
// INITIALIZATION
// =====================

// Add to your existing DOMContentLoaded in main.js
document.addEventListener('DOMContentLoaded', function() {
    // Add inventory styles
    addInventoryStyles();
    
    // Register inventory shortcuts
    shortcutManager.register(['Alt', 'I'], () => loadInventory(), "View Inventory");
    shortcutManager.register(['Alt', 'N'], () => {
        if (!document.getElementById("inventory").classList.contains("hidden")) {
            document.getElementById("itemName")?.focus();
        }
    }, "Add New Item");
});