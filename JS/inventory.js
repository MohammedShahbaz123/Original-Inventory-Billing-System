// Inventory management
let allItems = [];
let selectedItems = new Set();
let categories = ['electronics', 'clothing', 'furniture', 'groceries', 'books', 'other'];
let currentSheetData = [];
let isBulkAddMode = true;
let jspreadsheet = null;

// Navigation function
function showInventoryPage() {
    console.log('📦 Navigating to inventory page');
    Navigation.showPage('inventory');
    loadInventory();
}

async function loadInventory() {
    console.log('🚀 Loading inventory data...');
    
    try {
        // Show loading state
        showInventoryLoading();
        
        // Fetch data
        allItems = await SupabaseService.getItems();
        console.log('✅ Loaded', allItems.length, 'items');
        
        // Update UI
        displayInventory(allItems);
        updateInventorySummary(allItems);
        populateCategoryFilter();
        
    } catch (error) {
        console.error('❌ Error loading inventory:', error);
        showInventoryError();
    }
}

function showInventoryLoading() {
    const inventoryTable = document.getElementById('inventoryTable');
    if (inventoryTable) {
        inventoryTable.innerHTML = `
            <tr>
                <td colspan="7" class="loading-cell">
                    <div class="loading-spinner"></div>
                    Loading inventory...
                </td>
            </tr>
        `;
    }
}

function showInventoryError() {
    const inventoryTable = document.getElementById('inventoryTable');
    if (inventoryTable) {
        inventoryTable.innerHTML = `
            <tr>
                <td colspan="7" class="error-state">
                    <div class="error-state-content">
                        <div class="error-icon">⚠️</div>
                        <h3>Failed to Load Inventory</h3>
                        <p>There was an error loading the inventory data.</p>
                        <button onclick="loadInventory()" class="retry-btn">🔄 Retry</button>
                    </div>
                </td>
            </tr>
        `;
    }
}

function displayInventory(items) {
    const inventoryTable = document.getElementById('inventoryTable');
    if (!inventoryTable) {
        console.error('Inventory table not found!');
        return;
    }

    if (items.length === 0) {
        inventoryTable.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div class="empty-state-content">
                        <div class="empty-icon">📦</div>
                        <h3>No Items in Inventory</h3>
                        <p>Get started by adding your first item</p>
                        <button onclick="Navigation.showPage('createItem')" class="create-btn">+ Add Item</button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    inventoryTable.innerHTML = `
        <thead>
            <tr>
                <th width="50px">
                    <input type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll(this)">
                </th>
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
                <tr data-item-id="${item.id}" class="${selectedItems.has(item.id) ? 'selected' : ''}">
                    <td>
                        <input type="checkbox" class="item-checkbox" 
                               value="${item.id}" 
                               ${selectedItems.has(item.id) ? 'checked' : ''}
                               onchange="toggleItemSelection('${item.id}', this)">
                    </td>
                    <td>
                        <div class="item-name">${escapeHtml(item.name)}</div>
                        ${item.description ? `<div class="item-description">${escapeHtml(item.description)}</div>` : ''}
                    </td>
                    <td>
                        <span class="category-badge ${item.category || 'uncategorized'}">
                            ${getCategoryLabel(item.category)}
                        </span>
                    </td>
                    <td class="price-cell">${Utils.formatCurrency(item.price)}</td>
                    <td>
                        <span class="stock-badge ${getStockStatusClass(item.stock, item.low_stock_threshold)}">
                            ${item.stock} units
                            ${item.stock <= (item.low_stock_threshold || 10) ? '⚠️' : ''}
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

    // Update bulk actions visibility
    updateBulkActionsVisibility();
}

function getStockStatusClass(stock, lowStockThreshold = 10) {
    if (stock === 0) return 'out-of-stock';
    if (stock <= lowStockThreshold) return 'low-stock';
    return 'in-stock';
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

function populateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;

    // Get unique categories from items
    const itemCategories = [...new Set(allItems.map(item => item.category).filter(Boolean))];
    const allCategories = [...new Set([...categories, ...itemCategories])];

    categoryFilter.innerHTML = `
        <option value="all">All Categories</option>
        ${allCategories.map(cat => `
            <option value="${cat}">${getCategoryLabel(cat)}</option>
        `).join('')}
    `;
}

// Bulk Selection Functions
function toggleSelectAll(checkbox) {
    const itemCheckboxes = document.querySelectorAll('.item-checkbox');
    if (checkbox.checked) {
        itemCheckboxes.forEach(cb => {
            cb.checked = true;
            selectedItems.add(cb.value);
        });
    } else {
        itemCheckboxes.forEach(cb => {
            cb.checked = false;
        });
        selectedItems.clear();
    }
    updateBulkActionsVisibility();
    updateSelectedCount();
    highlightSelectedRows();
}

function toggleItemSelection(itemId, checkbox) {
    if (checkbox.checked) {
        selectedItems.add(itemId);
    } else {
        selectedItems.delete(itemId);
        // Uncheck select all checkbox if any item is deselected
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }
    }
    updateBulkActionsVisibility();
    updateSelectedCount();
    highlightSelectedRows();
}

function updateBulkActionsVisibility() {
    const bulkActions = document.getElementById('bulkActions');
    if (bulkActions) {
        bulkActions.style.display = selectedItems.size > 0 ? 'block' : 'none';
    }
}

function updateSelectedCount() {
    const selectedCount = document.getElementById('selectedCount');
    if (selectedCount) {
        selectedCount.textContent = `${selectedItems.size} item${selectedItems.size !== 1 ? 's' : ''} selected`;
    }
}

function highlightSelectedRows() {
    document.querySelectorAll('#inventoryTable tbody tr').forEach(row => {
        const itemId = row.getAttribute('data-item-id');
        if (selectedItems.has(itemId)) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }
    });
}

function clearSelection() {
    selectedItems.clear();
    document.querySelectorAll('.item-checkbox').forEach(cb => cb.checked = false);
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
    }
    updateBulkActionsVisibility();
    highlightSelectedRows();
}

// Bulk Action Handler
function handleBulkActionChange(select) {
    const action = select.value;
    if (!action) return;

    switch (action) {
        case 'bulk-add':
            showBulkAddSheet();
            break;
        case 'bulk-edit':
            showBulkEditSheet();
            break;
        case 'add-stock':
            bulkAddStock();
            break;
        case 'edit-selected':
            bulkEditSelectedItems();
            break;
        case 'delete-selected':
            bulkDeleteItems();
            break;
    }
    
    // Reset dropdown
    select.value = '';
}

// Bulk Add Sheet
function showBulkAddSheet() {
    isBulkAddMode = true;
    const modal = document.getElementById('sheetModal');
    if (!modal) {
        console.error('Sheet modal not found!');
        return;
    }
    
    const title = document.getElementById('sheetModalTitle');
    const instructions = document.getElementById('sheetInstructions');
    const processBtn = document.getElementById('processSheetBtn');
    
    title.textContent = 'Bulk Add Items';
    processBtn.textContent = '💾 Save Items';
    instructions.innerHTML = `
        <strong>Instructions:</strong>
        <ul>
            <li>Add multiple items at once using this spreadsheet interface</li>
            <li>Required fields: <strong>Name, Price, Stock</strong></li>
            <li>Optional fields: Category, Low Stock Threshold, Description</li>
            <li>Use the "Enlarge" button to open in a full Google Sheets-like interface</li>
            <li>Click "Add Sample Row" to see the expected format</li>
        </ul>
    `;
    
    initializeSpreadsheet([], true);
    modal.classList.remove('hidden');
}

// Bulk Edit Sheet
function showBulkEditSheet() {
    isBulkAddMode = false;
    const modal = document.getElementById('sheetModal');
    if (!modal) {
        console.error('Sheet modal not found!');
        return;
    }
    
    const title = document.getElementById('sheetModalTitle');
    const instructions = document.getElementById('sheetInstructions');
    const processBtn = document.getElementById('processSheetBtn');
    
    title.textContent = 'Bulk Edit Items';
    processBtn.textContent = '💾 Update Items';
    instructions.innerHTML = `
        <strong>Instructions:</strong>
        <ul>
            <li>Edit multiple items at once using this spreadsheet interface</li>
            <li>All fields are editable except ID</li>
            <li>Use the "Enlarge" button to open in a full Google Sheets-like interface</li>
            <li>Changes will be saved when you click "Update Items"</li>
        </ul>
    `;
    
    // Load current items data
    const itemsData = allItems.map(item => [
        item.id,
        item.name || '',
        item.category || '',
        item.price || 0,
        item.stock || 0,
        item.low_stock_threshold || 10,
        item.description || ''
    ]);
    
    initializeSpreadsheet(itemsData, false);
    modal.classList.remove('hidden');
}

// Initialize Spreadsheet
function initializeSpreadsheet(data, isAddMode) {
    const container = document.getElementById('spreadsheet');
    if (!container) {
        console.error('Spreadsheet container not found!');
        return;
    }
    
    container.innerHTML = '';

    const columns = [
        { 
            title: 'ID', 
            width: 80, 
            type: 'text',
            readOnly: true
        },
        { 
            title: 'Name *', 
            width: 150, 
            type: 'text'
        },
        { 
            title: 'Category', 
            width: 120, 
            type: 'dropdown',
            source: categories,
            autocomplete: true
        },
        { 
            title: 'Price *', 
            width: 100, 
            type: 'numeric',
            mask: '#,##0.00'
        },
        { 
            title: 'Stock *', 
            width: 80, 
            type: 'numeric',
            mask: '#,##0'
        },
        { 
            title: 'Low Stock', 
            width: 100, 
            type: 'numeric',
            mask: '#,##0'
        },
        { 
            title: 'Description', 
            width: 200, 
            type: 'text'
        }
    ];

    // If in add mode, remove ID column and start with empty rows
    if (isAddMode) {
        columns.shift(); // Remove ID column
        if (data.length === 0) {
            data = [['', '', 0, 0, 10, '']]; // One empty row
        }
    }

    try {
        jspreadsheet = jspreadsheet(container, {
            data: data,
            columns: columns,
            minDimensions: [isAddMode ? 6 : 7, 10],
            tableOverflow: true,
            tableWidth: "100%",
            tableHeight: "400px",
            onchange: function(instance, cell, x, y, value) {
                updateSheetData();
            },
            oninsertrow: function(instance, rowNumber, numOfRows, records, insertBefore) {
                updateSheetData();
            },
            ondeleterow: function(instance, rowNumber, numOfRows, records) {
                updateSheetData();
            }
        });

        updateSheetData();
    } catch (error) {
        console.error('Error initializing spreadsheet:', error);
        Utils.showNotification('Error initializing spreadsheet. Please check console.', 'error');
    }
}

// Update sheet data in memory
function updateSheetData() {
    if (jspreadsheet) {
        currentSheetData = jspreadsheet.getData();
    }
}

// Add sample data row
function addSampleData() {
    if (jspreadsheet) {
        const sampleRow = isBulkAddMode ? 
            ['Sample Item', 'electronics', 99.99, 50, 10, 'This is a sample item description'] :
            [null, 'Sample Item', 'electronics', 99.99, 50, 10, 'This is a sample item description'];
        
        jspreadsheet.insertRow();
        const lastRow = jspreadsheet.getData().length - 1;
        
        sampleRow.forEach((value, index) => {
            jspreadsheet.setValueFromCoords(index, lastRow, value);
        });
        
        updateSheetData();
    }
}

// Process sheet data and save to database
async function processSheetData() {
    if (!jspreadsheet) return;

    const data = jspreadsheet.getData();
    const processBtn = document.getElementById('processSheetBtn');
    Utils.showLoading(processBtn);

    try {
        if (isBulkAddMode) {
            await processBulkAdd(data);
        } else {
            await processBulkEdit(data);
        }
    } catch (error) {
        console.error('Error processing sheet data:', error);
        Utils.showNotification('Error processing items', 'error');
    } finally {
        Utils.hideLoading(processBtn);
    }
}

// Process bulk add
async function processBulkAdd(data) {
    const itemsToAdd = [];
    const errors = [];

    data.forEach((row, index) => {
        // Skip empty rows
        if (!row[0] && !row[1] && !row[2]) return;

        const [name, category, price, stock, lowStock, description] = row;

        // Validate required fields
        if (!name) {
            errors.push(`Row ${index + 1}: Name is required`);
            return;
        }
        if (!price || isNaN(price) || price < 0) {
            errors.push(`Row ${index + 1}: Valid price is required`);
            return;
        }
        if (!stock || isNaN(stock) || stock < 0) {
            errors.push(`Row ${index + 1}: Valid stock quantity is required`);
            return;
        }

        itemsToAdd.push({
            name: name.toString().trim(),
            category: category ? category.toString().trim() : null,
            price: parseFloat(price),
            stock: parseInt(stock),
            low_stock_threshold: lowStock ? parseInt(lowStock) : 10,
            description: description ? description.toString().trim() : null,
            created_at: new Date().toISOString()
        });
    });

    if (errors.length > 0) {
        Utils.showNotification(`Please fix errors:\n${errors.join('\n')}`, 'error');
        return;
    }

    if (itemsToAdd.length === 0) {
        Utils.showNotification('No valid items to add', 'warning');
        return;
    }

    // Add items to database
    for (const item of itemsToAdd) {
        await SupabaseService.createItem(item);
    }

    Utils.showNotification(`Successfully added ${itemsToAdd.length} items`, 'success');
    closeSheetModal();
    await loadInventory();
}

// Process bulk edit
async function processBulkEdit(data) {
    const updates = [];
    const errors = [];

    data.forEach((row, index) => {
        const [id, name, category, price, stock, lowStock, description] = row;

        // Skip rows without ID (new rows in edit mode)
        if (!id) return;

        // Validate required fields
        if (!name) {
            errors.push(`Row ${index + 1}: Name is required`);
            return;
        }
        if (!price || isNaN(price) || price < 0) {
            errors.push(`Row ${index + 1}: Valid price is required`);
            return;
        }
        if (!stock || isNaN(stock) || stock < 0) {
            errors.push(`Row ${index + 1}: Valid stock quantity is required`);
            return;
        }

        updates.push({
            id: id,
            data: {
                name: name.toString().trim(),
                category: category ? category.toString().trim() : null,
                price: parseFloat(price),
                stock: parseInt(stock),
                low_stock_threshold: lowStock ? parseInt(lowStock) : 10,
                description: description ? description.toString().trim() : null,
                updated_at: new Date().toISOString()
            }
        });
    });

    if (errors.length > 0) {
        Utils.showNotification(`Please fix errors:\n${errors.join('\n')}`, 'error');
        return;
    }

    if (updates.length === 0) {
        Utils.showNotification('No valid items to update', 'warning');
        return;
    }

    // Update items in database
    for (const update of updates) {
        await SupabaseService.updateItem(update.id, update.data);
    }

    Utils.showNotification(`Successfully updated ${updates.length} items`, 'success');
    closeSheetModal();
    await loadInventory();
}

// Enlarge sheet to Google Sheets-like interface
function enlargeSheet() {
    if (!jspreadsheet) return;

    const data = jspreadsheet.getData();
    const enlargedModal = document.getElementById('enlargedSheetModal');
    if (!enlargedModal) {
        console.error('Enlarged sheet modal not found!');
        return;
    }
    
    const title = document.getElementById('enlargedSheetTitle');
    
    title.textContent = isBulkAddMode ? 'Bulk Add Items' : 'Bulk Edit Items';
    
    // Create a CSV representation of the data
    const headers = isBulkAddMode ? 
        ['Name', 'Category', 'Price', 'Stock', 'Low Stock', 'Description'] :
        ['ID', 'Name', 'Category', 'Price', 'Stock', 'Low Stock', 'Description'];
    
    const csvData = [headers, ...data];
    const csvContent = csvData.map(row => 
        row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // Create a Blob and URL for the CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const frame = document.getElementById('googleSheetsFrame');
    frame.srcdoc = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Inventory Sheet</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 20px;
                    background: #f5f5f5;
                }
                .sheet-container {
                    background: white;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .sheet-header {
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #e0e0e0;
                }
                textarea {
                    width: 100%;
                    height: 60vh;
                    padding: 15px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 14px;
                    resize: vertical;
                }
                .instructions {
                    background: #e3f2fd;
                    padding: 15px;
                    border-radius: 4px;
                    margin-bottom: 15px;
                }
                .download-link {
                    display: inline-block;
                    margin-top: 10px;
                    padding: 8px 16px;
                    background: #4caf50;
                    color: white;
                    text-decoration: none;
                    border-radius: 4px;
                }
            </style>
        </head>
        <body>
            <div class="sheet-container">
                <div class="sheet-header">
                    <h2>${isBulkAddMode ? 'Bulk Add Items' : 'Bulk Edit Items'}</h2>
                    <div class="instructions">
                        <strong>CSV Format:</strong> Edit the data below in CSV format. 
                        Save your changes and use the "Sync to Website" button to update the main interface.
                        <br><br>
                        <a href="${url}" download="inventory_data.csv" class="download-link">
                            📥 Download CSV
                        </a>
                    </div>
                </div>
                <textarea id="csvData">${csvContent}</textarea>
            </div>
            <script>
                // Store original data for change detection
                const originalData = \`${csvContent}\`;
                
                // Check for changes when closing
                window.addEventListener('beforeunload', function (e) {
                    const currentData = document.getElementById('csvData').value;
                    if (currentData !== originalData) {
                        e.preventDefault();
                        e.returnValue = '';
                    }
                });
            </script>
        </body>
        </html>
    `;
    
    enlargedModal.classList.remove('hidden');
    closeSheetModal();
}

// Sync data back from enlarged sheet
function syncFromEnlargedSheet() {
    const frame = document.getElementById('googleSheetsFrame');
    const frameDoc = frame.contentDocument || frame.contentWindow.document;
    const csvTextarea = frameDoc.getElementById('csvData');
    
    if (csvTextarea) {
        const csvData = csvTextarea.value;
        const rows = csvData.split('\n').map(row => row.split(',').map(cell => 
            cell.replace(/^"|"$/g, '').replace(/""/g, '"')
        ));
        
        // Remove header row
        rows.shift();
        
        // Update the main spreadsheet
        if (jspreadsheet) {
            jspreadsheet.setData(rows);
            updateSheetData();
        }
        
        Utils.showNotification('Data synced from enlarged view', 'success');
        closeEnlargedSheet();
        showSheetModal(); // Reopen the main sheet modal
    }
}

// Close modals
function closeSheetModal() {
    const modal = document.getElementById('sheetModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    if (jspreadsheet) {
        try {
            jspreadsheet.destroy();
        } catch (error) {
            console.error('Error destroying spreadsheet:', error);
        }
        jspreadsheet = null;
    }
}

function closeEnlargedSheet() {
    const modal = document.getElementById('enlargedSheetModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function showSheetModal() {
    const modal = document.getElementById('sheetModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Download template
function downloadSheetTemplate() {
    const headers = isBulkAddMode ? 
        ['Name', 'Category', 'Price', 'Stock', 'Low Stock', 'Description'] :
        ['ID', 'Name', 'Category', 'Price', 'Stock', 'Low Stock', 'Description'];
    
    const sampleData = isBulkAddMode ? 
        ['Sample Item', 'electronics', '99.99', '50', '10', 'Sample description'] :
        [null, 'Sample Item', 'electronics', '99.99', '50', '10', 'Sample description'];
    
    const csvContent = [headers, sampleData]
        .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_template_${isBulkAddMode ? 'add' : 'edit'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Bulk edit selected items
function bulkEditSelectedItems() {
    if (selectedItems.size === 0) {
        Utils.showNotification('Please select items to edit', 'warning');
        return;
    }

    const selectedItemsData = allItems
        .filter(item => selectedItems.has(item.id))
        .map(item => [
            item.id,
            item.name || '',
            item.category || '',
            item.price || 0,
            item.stock || 0,
            item.low_stock_threshold || 10,
            item.description || ''
        ]);
    
    isBulkAddMode = false;
    const modal = document.getElementById('sheetModal');
    if (!modal) {
        console.error('Sheet modal not found!');
        return;
    }
    
    const title = document.getElementById('sheetModalTitle');
    const instructions = document.getElementById('sheetInstructions');
    const processBtn = document.getElementById('processSheetBtn');
    
    title.textContent = 'Bulk Edit Selected Items';
    processBtn.textContent = '💾 Update Items';
    instructions.innerHTML = `
        <strong>Instructions:</strong>
        <ul>
            <li>Editing ${selectedItems.size} selected items</li>
            <li>All fields are editable except ID</li>
            <li>Use the "Enlarge" button for better editing experience</li>
            <li>Changes will be saved when you click "Update Items"</li>
        </ul>
    `;
    
    initializeSpreadsheet(selectedItemsData, false);
    modal.classList.remove('hidden');
}

// Bulk add stock to selected items
async function bulkAddStock() {
    if (selectedItems.size === 0) {
        Utils.showNotification('Please select items to add stock', 'warning');
        return;
    }

    const quantity = prompt(`Enter quantity to add to ${selectedItems.size} selected items:`, "10");
    if (!quantity || isNaN(quantity) || parseInt(quantity) <= 0) {
        Utils.showNotification('Please enter a valid quantity', 'warning');
        return;
    }

    try {
        const updatePromises = Array.from(selectedItems).map(async (itemId) => {
            const item = allItems.find(i => i.id === itemId);
            if (item) {
                return SupabaseService.updateItem(itemId, {
                    stock: item.stock + parseInt(quantity),
                    updated_at: new Date().toISOString()
                });
            }
        });

        await Promise.all(updatePromises);
        Utils.showNotification(`Added ${quantity} stock to ${selectedItems.size} items`, 'success');
        clearSelection();
        await loadInventory();
    } catch (error) {
        console.error('Error adding stock:', error);
        Utils.showNotification('Error adding stock to items', 'error');
    }
}

// Bulk delete items
async function bulkDeleteItems() {
    if (selectedItems.size === 0) {
        Utils.showNotification('Please select items to delete', 'warning');
        return;
    }

    const itemNames = Array.from(selectedItems).map(id => {
        const item = allItems.find(i => i.id === id);
        return item ? item.name : 'Unknown Item';
    }).join(', ');

    if (confirm(`Are you sure you want to delete ${selectedItems.size} items?\n\n${itemNames}\n\nThis action cannot be undone.`)) {
        try {
            const deletePromises = Array.from(selectedItems).map(id => 
                SupabaseService.deleteItem(id)
            );
            
            await Promise.all(deletePromises);
            Utils.showNotification(`Successfully deleted ${selectedItems.size} items`, 'success');
            selectedItems.clear();
            await loadInventory();
        } catch (error) {
            console.error('Error deleting items:', error);
            Utils.showNotification('Error deleting items', 'error');
        }
    }
}

// Category Management
function showCreateCategoryModal() {
    const modal = document.getElementById('createCategoryModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('newCategoryName').value = '';
        document.getElementById('newCategoryName').focus();
    }
}

function closeCreateCategoryModal() {
    const modal = document.getElementById('createCategoryModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function createNewCategory() {
    const categoryName = document.getElementById('newCategoryName').value.trim();
    
    if (!categoryName) {
        Utils.showNotification('Please enter a category name', 'warning');
        return;
    }

    // Convert to lowercase for consistency
    const categoryKey = categoryName.toLowerCase().replace(/\s+/g, '_');
    
    if (categories.includes(categoryKey)) {
        Utils.showNotification('Category already exists', 'warning');
        return;
    }

    // Add to categories array
    categories.push(categoryKey);
    
    Utils.showNotification(`Category "${categoryName}" created successfully`, 'success');
    closeCreateCategoryModal();
    populateCategoryFilter();
}

// Category Filter Function
function filterByCategory() {
    const categoryFilter = document.getElementById('categoryFilter');
    const selectedCategory = categoryFilter ? categoryFilter.value : 'all';
    
    let filteredItems = allItems;
    
    if (selectedCategory !== 'all') {
        filteredItems = allItems.filter(item => item.category === selectedCategory);
    }
    
    const searchTerm = document.getElementById('inventorySearch').value.toLowerCase();
    if (searchTerm) {
        filteredItems = filteredItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            (item.category && item.category.toLowerCase().includes(searchTerm)) ||
            (item.description && item.description.toLowerCase().includes(searchTerm))
        );
    }
    
    displayInventory(filteredItems);
}

function filterInventory() {
    filterByCategory(); // Use the combined filter function
}

// Update the existing updateInventorySummary function to include low stock count
function updateInventorySummary(items) {
    const summaryElement = document.getElementById('inventorySummary');
    if (!summaryElement) return;

    const totalItems = items.length;
    const totalStock = items.reduce((sum, item) => sum + item.stock, 0);
    const totalValue = items.reduce((sum, item) => sum + (item.price * item.stock), 0);
    const outOfStock = items.filter(item => item.stock === 0).length;
    const lowStock = items.filter(item => {
        const threshold = item.low_stock_threshold || 10;
        return item.stock > 0 && item.stock <= threshold;
    }).length;

    summaryElement.innerHTML = `
        <div class="summary-stats">
            <div class="stat">
                <div class="stat-icon">📦</div>
                <div class="stat-content">
                    <span class="stat-value">${totalItems}</span>
                    <span class="stat-label">Total Items</span>
                </div>
            </div>
            
            <div class="stat">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                    <span class="stat-value">${totalStock}</span>
                    <span class="stat-label">Total Stock</span>
                </div>
            </div>
            
            <div class="stat">
                <div class="stat-icon">💰</div>
                <div class="stat-content">
                    <span class="stat-value">${Utils.formatCurrency(totalValue)}</span>
                    <span class="stat-label">Total Value</span>
                </div>
            </div>
            
            <div class="stat">
                <div class="stat-icon">🚫</div>
                <div class="stat-content">
                    <span class="stat-value ${outOfStock > 0 ? 'warning' : ''}">${outOfStock}</span>
                    <span class="stat-label">Out of Stock</span>
                </div>
            </div>
            
            <div class="stat">
                <div class="stat-icon">⚠️</div>
                <div class="stat-content">
                    <span class="stat-value ${lowStock > 0 ? 'warning' : ''}">${lowStock}</span>
                    <span class="stat-label">Low Stock</span>
                </div>
            </div>
        </div>
    `;
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Item editing functions
let editingItemId = null;

function editItem(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (item) {
        editingItemId = itemId;
        showEditItemPage(item);
    }
}

function showEditItemPage(item) {
    // Create the edit page HTML
    const editPageHTML = `
        <div class="page" id="editItemPage">
            <div class="header">
                <div class="header-left">
                    <button onclick="closeEditItemPage()" class="back-arrow-btn">←</button>
                    <h1>Edit Item</h1>
                </div>
                <div class="header-right">
                    <button onclick="resetEditItemForm()" class="secondary-btn">🔄 Reset</button>
                </div>
            </div>
            
            <div class="form-container">
                <form id="editItemForm">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="editItemName">Item Name *</label>
                            <input type="text" id="editItemName" required 
                                   value="${escapeHtml(item.name)}"
                                   placeholder="Enter item name"
                                   maxlength="100">
                            <div class="form-hint">Enter a descriptive name for the item</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="editItemPrice">Price (₹) *</label>
                            <div class="input-with-icon">
                                <span class="input-icon">₹</span>
                                <input type="number" id="editItemPrice" required min="0" step="0.01"
                                       value="${item.price}"
                                       placeholder="0.00" oninput="formatEditPrice(this)">
                            </div>
                            <div class="form-hint">Enter the selling price per unit</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="editItemStock">Current Stock *</label>
                            <input type="number" id="editItemStock" required min="0" step="1"
                                   value="${item.stock}"
                                   placeholder="0" oninput="validateEditStock(this)">
                            <div class="form-hint">Current quantity in stock</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="editItemLowStock">Low Stock Threshold</label>
                            <input type="number" id="editItemLowStock" min="0" step="1"
                                   value="${item.low_stock_threshold || 10}"
                                   placeholder="10">
                            <div class="form-hint">Alert when stock reaches this level</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="editItemCategory">Category</label>
                            <select id="editItemCategory">
                                <option value="">Select Category</option>
                                <option value="electronics" ${item.category === 'electronics' ? 'selected' : ''}>Electronics</option>
                                <option value="clothing" ${item.category === 'clothing' ? 'selected' : ''}>Clothing</option>
                                <option value="furniture" ${item.category === 'furniture' ? 'selected' : ''}>Furniture</option>
                                <option value="groceries" ${item.category === 'groceries' ? 'selected' : ''}>Groceries</option>
                                <option value="books" ${item.category === 'books' ? 'selected' : ''}>Books</option>
                                <option value="other" ${item.category === 'other' ? 'selected' : ''}>Other</option>
                            </select>
                            <div class="form-hint">Categorize for better organization</div>
                        </div>
                        
                        <div class="form-group full-width">
                            <label for="editItemDescription">Description (Optional)</label>
                            <textarea id="editItemDescription" rows="3" 
                                      placeholder="Enter item description..."
                                      maxlength="500">${escapeHtml(item.description || '')}</textarea>
                            <div class="form-hint">Optional description for the item</div>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" onclick="closeEditItemPage()" class="cancel-btn">Cancel</button>
                        <button type="submit" class="submit-btn">
                            <span id="editItemSubmitText">💾 Update Item</span>
                            <div id="editItemLoading" class="loading-spinner" style="display: none;"></div>
                        </button>
                    </div>
                </form>
            </div>
            
            <div class="danger-zone">
                <h3>⚠️ Danger Zone</h3>
                <div class="danger-actions">
                    <button onclick="deleteItemFromEdit('${item.id}')" class="danger-btn">
                        🗑️ Delete Item
                    </button>
                    <p class="danger-warning">This action cannot be undone. All associated sales and purchase records will be affected.</p>
                </div>
            </div>
        </div>
    `;

    // Hide all current pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });

    // Create and append the edit page
    const editPageContainer = document.createElement('div');
    editPageContainer.innerHTML = editPageHTML;
    document.querySelector('main.content').appendChild(editPageContainer.firstElementChild);

    // Add form submission handler
    document.getElementById('editItemForm').addEventListener('submit', handleEditItemSubmit);
}

function closeEditItemPage() {
    const editPage = document.getElementById('editItemPage');
    if (editPage) {
        editPage.remove();
    }
    editingItemId = null;
    
    // Show the inventory page
    Navigation.showPage('inventory');
}

function resetEditItemForm() {
    const item = allItems.find(i => i.id === editingItemId);
    if (item) {
        document.getElementById('editItemName').value = item.name;
        document.getElementById('editItemPrice').value = item.price;
        document.getElementById('editItemStock').value = item.stock;
        document.getElementById('editItemLowStock').value = item.low_stock_threshold || 10;
        document.getElementById('editItemCategory').value = item.category || '';
        document.getElementById('editItemDescription').value = item.description || '';
    }
}

function formatEditPrice(input) {
    let value = input.value.replace(/[^\d.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts.length === 2) {
        value = parts[0] + '.' + parts[1].slice(0, 2);
    }
    input.value = value;
}

function validateEditStock(input) {
    let value = parseInt(input.value);
    if (isNaN(value) || value < 0) {
        input.value = '0';
    }
}

async function handleEditItemSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('editItemSubmitText').closest('button');
    Utils.showLoading(submitBtn);

    try {
        const itemData = {
            name: document.getElementById('editItemName').value.trim(),
            price: parseFloat(document.getElementById('editItemPrice').value),
            stock: parseInt(document.getElementById('editItemStock').value),
            low_stock_threshold: parseInt(document.getElementById('editItemLowStock').value) || 10,
            category: document.getElementById('editItemCategory').value || null,
            description: document.getElementById('editItemDescription').value.trim() || null,
            updated_at: new Date().toISOString()
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

        await SupabaseService.updateItem(editingItemId, itemData);
        Utils.showNotification('Item updated successfully', 'success');
        
        closeEditItemPage();
        
        // Refresh inventory list
        await loadInventory();
        
    } catch (error) {
        console.error('Error updating item:', error);
        Utils.showNotification('Error updating item', 'error');
    } finally {
        Utils.hideLoading(submitBtn);
    }
}

function deleteItemFromEdit(itemId) {
    deleteItem(itemId);
    closeEditItemPage();
}

async function deleteItem(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    if (confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone and may affect existing invoices.`)) {
        try {
            await SupabaseService.deleteItem(itemId);
            Utils.showNotification('Item deleted successfully', 'success');
            await loadInventory();
        } catch (error) {
            console.error('Error deleting item:', error);
            Utils.showNotification('Error deleting item', 'error');
        }
    }
}

// Update the create item form to include low stock threshold
function updateCreateItemForm() {
    // This function should be called when the create item form is loaded
    // Add low stock field to the create form
    const createForm = document.getElementById('itemForm');
    if (createForm && !document.getElementById('itemLowStock')) {
        // Find the stock input and insert low stock field after it
        const stockInput = document.getElementById('itemStock');
        if (stockInput) {
            const lowStockHTML = `
                <div class="form-group">
                    <label for="itemLowStock">Low Stock Threshold</label>
                    <input type="number" id="itemLowStock" min="0" step="1" value="10" placeholder="10">
                    <div class="form-hint">Alert when stock reaches this level</div>
                </div>
            `;
            stockInput.closest('.form-group').insertAdjacentHTML('afterend', lowStockHTML);
        }
    }
}

// Update the create item form submission
document.addEventListener('DOMContentLoaded', function() {
    // Update create form if it exists
    const createForm = document.getElementById('itemForm');
    if (createForm) {
        // Add low stock field to create form
        updateCreateItemForm();
        
        // Update form submission to include low_stock_threshold
        const originalSubmit = createForm.onsubmit;
        createForm.onsubmit = async function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('itemSubmitText')?.closest('button');
            Utils.showLoading(submitBtn);

            try {
                const itemData = {
                    name: document.getElementById('itemName').value.trim(),
                    price: parseFloat(document.getElementById('itemPrice').value),
                    stock: parseInt(document.getElementById('itemStock').value),
                    low_stock_threshold: parseInt(document.getElementById('itemLowStock')?.value) || 10,
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
                Utils.showNotification('Error creating item', 'error');
            } finally {
                Utils.hideLoading(submitBtn);
            }
        };
    }

    // Check if we're on the inventory page and load data
    if (document.getElementById('inventory') && !document.getElementById('inventory').classList.contains('hidden')) {
        loadInventory();
    }
});