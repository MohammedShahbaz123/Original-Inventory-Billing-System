// Inventory management
let allItems = [];

async function loadInventory() {
    try {
        const inventoryTable = document.getElementById('inventoryTable');
        if (inventoryTable) {
            inventoryTable.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-cell">
                        <div class="loading-spinner"></div>
                        Loading inventory...
                    </td>
                </tr>
            `;
        }

        allItems = await SupabaseService.getItems();
        displayInventory(allItems);
        updateInventorySummary(allItems);
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

function displayInventory(items) {
    const inventoryTable = document.getElementById('inventoryTable');
    if (!inventoryTable) return;

    if (items.length === 0) {
        inventoryTable.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-state-content">
                        <div class="empty-icon">📦</div>
                        <h3>No Items in Inventory</h3>
                        <p>Get started by adding your first item</p>
                        <button onclick="showPage('createItem')" class="create-btn">+ Add Item</button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    inventoryTable.innerHTML = `
        <thead>
            <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Value</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${items.map(item => `
                <tr data-item-id="${item.id}">
                    <td>
                        <div class="item-name">${item.name}</div>
                        ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                    </td>
                    <td>
                        <span class="category-badge ${item.category || 'uncategorized'}">
                            ${getCategoryLabel(item.category)}
                        </span>
                    </td>
                    <td class="price-cell">${Utils.formatCurrency(item.price)}</td>
                    <td>
                        <span class="stock-badge ${item.stock > 10 ? 'in-stock' : item.stock > 0 ? 'low-stock' : 'out-of-stock'}">
                            ${item.stock} units
                        </span>
                    </td>
                    <td class="value-cell">${Utils.formatCurrency(item.price * item.stock)}</td>
                    <td>
                        <div class="action-buttons">
                            <button onclick="editItem('${item.id}')" class="action-btn edit-btn" title="Edit">
                                ✏️
                            </button>
                            <button onclick="deleteItem('${item.id}')" class="action-btn delete-btn" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
}

function getCategoryLabel(category) {
    const categories = {
        'electronics': 'Electronics',
        'clothing': 'Clothing',
        'furniture': 'Furniture',
        'groceries': 'Groceries',
        'books': 'Books',
        'other': 'Other',
        'uncategorized': 'Uncategorized'
    };
    return categories[category] || category || 'Uncategorized';
}

function updateInventorySummary(items) {
    const summaryElement = document.getElementById('inventorySummary');
    if (!summaryElement) return;

    const totalItems = items.length;
    const totalStock = items.reduce((sum, item) => sum + item.stock, 0);
    const totalValue = items.reduce((sum, item) => sum + (item.price * item.stock), 0);
    const outOfStock = items.filter(item => item.stock === 0).length;
    const lowStock = items.filter(item => item.stock > 0 && item.stock <= 10).length;

    summaryElement.innerHTML = `
        <div class="summary-stats">
            <div class="stat">
                <span class="stat-value">${totalItems}</span>
                <span class="stat-label">Items</span>
            </div>
            <div class="stat">
                <span class="stat-value">${totalStock}</span>
                <span class="stat-label">Total Stock</span>
            </div>
            <div class="stat">
                <span class="stat-value">${Utils.formatCurrency(totalValue)}</span>
                <span class="stat-label">Total Value</span>
            </div>
            <div class="stat">
                <span class="stat-value ${outOfStock > 0 ? 'warning' : ''}">${outOfStock}</span>
                <span class="stat-label">Out of Stock</span>
            </div>
            <div class="stat">
                <span class="stat-value ${lowStock > 0 ? 'warning' : ''}">${lowStock}</span>
                <span class="stat-label">Low Stock</span>
            </div>
        </div>
    `;
}

function filterInventory() {
    const searchTerm = document.getElementById('inventorySearch').value.toLowerCase();
    const filteredItems = allItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        (item.category && item.category.toLowerCase().includes(searchTerm)) ||
        (item.description && item.description.toLowerCase().includes(searchTerm))
    );
    displayInventory(filteredItems);
}

// Item form functions
function resetItemForm() {
    document.getElementById('itemForm').reset();
}

function formatPrice(input) {
    // Remove any non-digit characters except decimal point
    let value = input.value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts.length === 2) {
        value = parts[0] + '.' + parts[1].slice(0, 2);
    }
    
    input.value = value;
}

function validateStock(input) {
    let value = parseInt(input.value);
    if (isNaN(value) || value < 0) {
        input.value = '0';
    }
}

function fillItemTemplate(name, price, stock) {
    document.getElementById('itemName').value = name;
    document.getElementById('itemPrice').value = price;
    document.getElementById('itemStock').value = stock;
    document.getElementById('itemCategory').value = 'electronics';
}

// Form submission
document.getElementById('itemForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('itemSubmitText').closest('button');
    Utils.showLoading(submitBtn);

    try {
        const itemData = {
            name: document.getElementById('itemName').value.trim(),
            price: parseFloat(document.getElementById('itemPrice').value),
            stock: parseInt(document.getElementById('itemStock').value),
            category: document.getElementById('itemCategory').value || null,
            created_at: new Date().toISOString()
        };

        // Validate required fields
        if (!itemData.name) {
            Utils.showNotification('Item name is required', 'warning');
            Utils.hideLoading(submitBtn);
            return;
        }

        if (isNaN(itemData.price) || itemData.price < 0) {
            Utils.showNotification('Valid price is required', 'warning');
            Utils.hideLoading(submitBtn);
            return;
        }

        if (isNaN(itemData.stock) || itemData.stock < 0) {
            Utils.showNotification('Valid stock quantity is required', 'warning');
            Utils.hideLoading(submitBtn);
            return;
        }

        await SupabaseService.createItem(itemData);
        resetItemForm();
        Navigation.showPage('inventory');
        
    } catch (error) {
        console.error('Error creating item:', error);
    } finally {
        Utils.hideLoading(submitBtn);
    }
});

function editItem(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (item) {
        // For now, we'll just show a notification
        // In a real app, you'd open an edit form
        Utils.showNotification(`Edit functionality for ${item.name} would open here`, 'info');
    }
}

async function deleteItem(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    if (confirm(`Are you sure you want to delete ${item.name}? This action cannot be undone and may affect existing invoices.`)) {
        try {
            // In a real app, you'd check for dependencies first
            await supabase.from('items').delete().eq('id', itemId);
            Utils.showNotification('Item deleted successfully', 'success');
            await loadInventory(); // Refresh the list
        } catch (error) {
            console.error('Error deleting item:', error);
            Utils.showNotification('Error deleting item', 'error');
        }
    }
}