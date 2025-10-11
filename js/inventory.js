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

// Update the quick add templates function to include default price
function fillItemTemplate(name, price, stock) {
    document.getElementById('itemName').value = name;
    document.getElementById('itemPrice').value = price || '0'; // Default to '0' if no price provided
    document.getElementById('itemStock').value = stock || '0'; // Default to '0' if no stock provided
    document.getElementById('itemCategory').value = 'electronics';
    
    // Set default low stock threshold if the field exists
    const lowStockField = document.getElementById('itemLowStock');
    if (lowStockField) {
        lowStockField.value = '10';
    }
    
    // Focus on the name field for quick editing
    document.getElementById('itemName').focus();
}

// Item form functions
function resetItemForm() {
    const form = document.getElementById('itemForm');
    if (form) {
        form.reset();
        // Set default values for specific fields
        const lowStockField = document.getElementById('itemLowStock');
        if (lowStockField) {
            lowStockField.value = '10';
        }
    }
}

// Update the create item form submission - REMOVED VALIDATION
function updateCreateItemFormSubmission() {
    const createForm = document.getElementById('itemForm');
    if (createForm) {
        // Remove any existing event listeners
        const newForm = createForm.cloneNode(true);
        createForm.parentNode.replaceChild(newForm, createForm);

        // Add new event listener
        newForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('itemSubmitText')?.closest('button');
            Utils.showLoading(submitBtn);

            try {
                const itemData = {
                    name: document.getElementById('itemName').value.trim(),
                    price: document.getElementById('itemPrice').value, // No parsing/validation
                    stock: document.getElementById('itemStock').value, // No parsing/validation
                    category: document.getElementById('itemCategory').value || null,
                    description: document.getElementById('itemDescription')?.value.trim() || null,
                    created_at: new Date().toISOString()
                };

                // Validate required fields - ONLY NAME REMAINS
                if (!itemData.name) {
                    Utils.showNotification('Item name is required', 'warning');
                    Utils.hideLoading(submitBtn);
                    return;
                }

                // REMOVED: Price validation
                // REMOVED: Stock validation

                await SupabaseService.createItem(itemData);
                resetItemForm();
                Navigation.showPage('inventory');
                
            } catch (error) {
                console.error('Error creating item:', error);
                Utils.showNotification('Error creating item: ' + error.message, 'error');
            } finally {
                Utils.hideLoading(submitBtn);
            }
        });
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

// Update the display functions to handle price defaults
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
                    <td class="price-cell">${Utils.formatCurrency(parseFloat(item.price) || 0)}</td>
                    <td>
                        <span class="stock-badge ${getStockStatusClass(item.stock || 0, item.low_stock_threshold || 10)}">
                            ${item.stock || 0} units
                            ${(item.stock || 0) <= (item.low_stock_threshold || 10) ? '⚠️' : ''}
                        </span>
                    </td>
                    <td class="value-cell">${Utils.formatCurrency((parseFloat(item.price) || 0) * (item.stock || 0))}</td>
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

function isJSpreadsheetLoaded() {
    return typeof jspreadsheet !== 'undefined' && typeof jspreadsheet === 'function';
}

// Global variable to store the spreadsheet instance
let jspreadsheetInstance = null;       

// Update the bulk add function to handle initialization failures
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
    
    // Try to initialize spreadsheet
    const success = initializeSpreadsheet([], true);
    
    if (success) {
        title.textContent = 'Bulk Add Items';
        processBtn.textContent = '💾 Save Items';
        instructions.innerHTML = `
            <strong>Instructions:</strong>
            <ul>
                <li>Add multiple items at once using this spreadsheet interface</li>
                <li>Required fields: <strong>Name</strong></li> <!-- REMOVED: Price, Stock from required -->
                <li>Optional fields: Category, Price, Stock, Low Stock Threshold, Description</li>
                <li>Use the "Enlarge" button to open in a full Google Sheets-like interface</li>
                <li>Click "Add Sample Row" to see the expected format</li>
            </ul>
        `;
    } else {
        title.textContent = 'Bulk Add Items (CSV Format)';
        processBtn.textContent = '💾 Save Items';
        instructions.innerHTML = `
            <strong>Instructions (CSV Format):</strong>
            <ul>
                <li>Add multiple items at once using CSV format</li>
                <li>Required fields: <strong>Name</strong></li> <!-- REMOVED: Price, Stock from required -->
                <li>Optional fields: Category, Price, Stock, Low Stock, Description</li>
                <li>Format: Name,Category,Price,Stock,Low Stock,Description</li>
                <li>Each row = one item, separate values with commas</li>
                <li>Click "Add Sample Row" to see the format</li>
            </ul>
        `;
    }
    
    modal.classList.remove('hidden');
}

// Improved fallback spreadsheet
function showFallbackSpreadsheet(data, isAddMode) {
    const container = document.getElementById('spreadsheet');
    if (!container) return;
    
    const headers = isAddMode ? 
        ['Name', 'Category', 'Price', 'Stock', 'Low Stock', 'Description'] :
        ['ID', 'Name', 'Category', 'Price', 'Stock', 'Low Stock', 'Description'];
    
    // Convert data to CSV
    let csvData = [headers];
    if (data && data.length > 0) {
        csvData = [...csvData, ...data];
    }
    
    const csvContent = csvData.map(row => 
        row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    container.innerHTML = `
        <div class="fallback-sheet">
            <div class="fallback-instructions">
                <strong>CSV Format:</strong> Enter your data in CSV format below. Each row represents one item.
                <br><strong>Columns:</strong> ${headers.join(', ')}
                <br><strong>Required:</strong> Name <!-- REMOVED: Price, Stock -->
            </div>
            <textarea id="fallbackCSV" rows="15" style="width: 100%; font-family: monospace; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">${csvContent}</textarea>
            <div class="fallback-actions" style="margin-top: 10px;">
                <button onclick="loadDataFromFallback(${isAddMode})" class="confirm-btn">📥 Load Data</button>
                <button onclick="addSampleToFallback(${isAddMode})" class="secondary-btn">➕ Add Sample Row</button>
            </div>
        </div>
    `;
}

function loadDataFromFallback(isAddMode) {
    const csvTextarea = document.getElementById('fallbackCSV');
    if (!csvTextarea) return;
    
    const csvData = csvTextarea.value;
    const rows = csvData.split('\n')
        .filter(row => row.trim()) // Remove empty rows
        .map(row => 
            row.split(',').map(cell => 
                cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"')
            )
        );
    
    // Remove header row and process data
    const headers = rows.shift();
    currentSheetData = rows.filter(row => row.some(cell => cell && cell.trim() !== ''));
    
    Utils.showNotification(`Loaded ${currentSheetData.length} rows from CSV`, 'success');
}

function addSampleToFallback(isAddMode) {
    const csvTextarea = document.getElementById('fallbackCSV');
    if (!csvTextarea) return;
    
    const sampleRow = isBulkAddMode ? 
        ['Sample Item', 'electronics', '99.99', '50', '10', 'Sample description'] :
        ['', 'Sample Item', 'electronics', '99.99', '50', '10', 'Sample description'];
    
    const currentContent = csvTextarea.value.trim();
    const newContent = currentContent + (currentContent ? '\n' : '') + sampleRow.map(cell => `"${cell}"`).join(',');
    csvTextarea.value = newContent;
    
    Utils.showNotification('Sample row added', 'success');
}

// Update sheet data safely
function updateSheetData() {
    if (jspreadsheetInstance && typeof jspreadsheetInstance.getData === 'function') {
        try {
            currentSheetData = jspreadsheetInstance.getData();
        } catch (error) {
            console.error('Error getting sheet data:', error);
        }
    }
}

// Add sample data row safely
function addSampleData() {
    if (!jspreadsheetInstance) {
        Utils.showNotification('Spreadsheet not initialized', 'error');
        return;
    }

    const sampleRow = isBulkAddMode ? 
        ['Sample Item', 'electronics', '99.99', '50', '10', 'This is a sample item description'] :
        [null, 'Sample Item', 'electronics', '99.99', '50', '10', 'This is a sample item description'];
    
    try {
        jspreadsheetInstance.insertRow();
        const lastRow = jspreadsheetInstance.getData().length - 1;
        
        sampleRow.forEach((value, index) => {
            jspreadsheetInstance.setValueFromCoords(index, lastRow, value);
        });
        
        updateSheetData();
    } catch (error) {
        console.error('Error adding sample data:', error);
        Utils.showNotification('Error adding sample data', 'error');
    }
}

// Process sheet data with proper instance checking
async function processSheetData() {
    let data = [];
    
    // Get data from either spreadsheet instance or fallback
    if (jspreadsheetInstance && typeof jspreadsheetInstance.getData === 'function') {
        try {
            data = jspreadsheetInstance.getData();
        } catch (error) {
            console.error('Error getting data from spreadsheet:', error);
        }
    } else {
        // Use fallback data
        data = currentSheetData;
    }
    
    // Filter out empty rows
    data = data.filter(row => row.some(cell => cell !== null && cell !== '' && cell !== undefined));
    
    if (data.length === 0) {
        Utils.showNotification('No data to process', 'warning');
        return;
    }

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
        Utils.showNotification('Error processing items: ' + error.message, 'error');
    } finally {
        Utils.hideLoading(processBtn);
    }
}

// In the bulk operations - provide default for price
async function processBulkAdd(data) {
    const itemsToAdd = [];
    const errors = [];

    data.forEach((row, index) => {
        // Skip empty rows
        if (!row[0] && !row[1] && !row[2]) return;

        const [name, category, price, stock, lowStock, description] = row;

        // Validate required fields - ONLY NAME REMAINS
        if (!name) {
            errors.push(`Row ${index + 1}: Name is required`);
            return;
        }

        // Handle empty values - convert empty strings to default values
        const processedPrice = price && price.toString().trim() !== '' ? price : '0'; // Default to '0'
        const processedStock = stock && stock.toString().trim() !== '' ? parseInt(stock) || 0 : 0;
        const processedLowStock = lowStock && lowStock.toString().trim() !== '' ? parseInt(lowStock) || 10 : 10;

        itemsToAdd.push({
            name: name.toString().trim(),
            category: category && category.toString().trim() !== '' ? category.toString().trim() : null,
            price: processedPrice,
            stock: processedStock,
            low_stock_threshold: processedLowStock,
            description: description && description.toString().trim() !== '' ? description.toString().trim() : null,
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

// In the bulk edit operation - provide default for price
async function processBulkEdit(data) {
    const updates = [];
    const errors = [];

    data.forEach((row, index) => {
        const [id, name, category, price, stock, lowStock, description] = row;

        // Skip rows without ID (new rows in edit mode)
        if (!id) return;

        // Validate required fields - ONLY NAME REMAINS
        if (!name) {
            errors.push(`Row ${index + 1}: Name is required`);
            return;
        }

        // Handle empty values - convert empty strings to default values
        const processedPrice = price && price.toString().trim() !== '' ? price : '0'; // Default to '0'
        const processedStock = stock && stock.toString().trim() !== '' ? parseInt(stock) || 0 : 0;
        const processedLowStock = lowStock && lowStock.toString().trim() !== '' ? parseInt(lowStock) || 10 : 10;

        updates.push({
            id: id,
            data: {
                name: name.toString().trim(),
                category: category && category.toString().trim() !== '' ? category.toString().trim() : null,
                price: processedPrice,
                stock: processedStock,
                low_stock_threshold: processedLowStock,
                description: description && description.toString().trim() !== '' ? description.toString().trim() : null,
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

// Update sheet data when cells change
function updateEnlargedSheetData(rowIndex, colIndex, value) {
    console.log(`📝 Updating cell [${rowIndex},${colIndex}] to:`, value);
    
    if (!currentSheetData[rowIndex]) {
        currentSheetData[rowIndex] = [];
    }
    currentSheetData[rowIndex][colIndex] = value;
    
    // Also update the main spreadsheet instance if it exists
    if (jspreadsheetInstance && typeof jspreadsheetInstance.setValue === 'function') {
        try {
            jspreadsheetInstance.setValueFromCoords(colIndex, rowIndex, value);
        } catch (error) {
            console.error('Error updating main spreadsheet:', error);
        }
    }
}

// Add sample data to enlarged sheet
function addSampleToEnlargedSheet() {
    const sampleRow = isBulkAddMode ? 
        ['Sample Item', 'electronics', '99.99', '50', '10', 'Sample description'] :
        ['', 'Sample Item', 'electronics', '99.99', '50', '10', 'Sample description'];
    
    addRowToEnlargedSheet();
    
    // Update the new row with sample data
    const tbody = document.getElementById('enlargedSheetsBody');
    const lastRow = tbody.lastElementChild;
    const cells = lastRow.querySelectorAll('.sheet-cell');
    
    sampleRow.forEach((value, index) => {
        if (index < cells.length) {
            const input = cells[index].querySelector('.sheet-input, .sheet-select, .sheet-textarea');
            if (input) {
                if (input.tagName === 'SELECT') {
                    input.value = value;
                } else {
                    input.value = value;
                }
                // Update data
                updateEnlargedSheetData(tbody.children.length - 1, index, value);
            }
        }
    });
    
    Utils.showNotification('Sample row added', 'success');
}

function createCellEditor(value, colIndex, header, rowIndex) {
    const cellValue = value || '';
    
    if (header === 'Category') {
        return `
            <select class="sheet-input sheet-select" onchange="updateEnlargedSheetData(${rowIndex}, ${colIndex}, this.value)">
                <option value="">Select Category</option>
                ${categories.map(cat => `
                    <option value="${cat}" ${cellValue === cat ? 'selected' : ''}>${getCategoryLabel(cat)}</option>
                `).join('')}
            </select>
        `;
    } else if (header === 'Price') {
        return `
            <input type="text" 
                   class="sheet-input" 
                   value="${cellValue}" 
                   onchange="updateEnlargedSheetData(${rowIndex}, ${colIndex}, this.value)"
                   placeholder="Enter price">
        `;
    } else if (header === 'Stock' || header === 'Low Stock') {
        return `
            <input type="number" 
                   class="sheet-input" 
                   value="${cellValue}" 
                   onchange="updateEnlargedSheetData(${rowIndex}, ${colIndex}, this.value)"
                   placeholder="Enter ${header.toLowerCase()}">
        `;
    } else if (header === 'Description') {
        return `
            <textarea class="sheet-input sheet-textarea" 
                      onchange="updateEnlargedSheetData(${rowIndex}, ${colIndex}, this.value)"
                      placeholder="Enter description">${cellValue}</textarea>
        `;
    } else if (header === 'ID') {
        return `
            <span class="sheet-id">${cellValue || 'Auto'}</span>
        `;
    } else {
        return `
            <input type="text" 
                   class="sheet-input" 
                   value="${cellValue}" 
                   onchange="updateEnlargedSheetData(${rowIndex}, ${colIndex}, this.value)"
                   placeholder="Enter ${header.toLowerCase()}">
        `;
    }
}

// Update sheet statistics
function updateEnlargedSheetStats() {
    const rowCountElement = document.getElementById('rowCount');
    if (rowCountElement) {
        const tbody = document.getElementById('enlargedSheetsBody');
        const rowCount = tbody ? tbody.children.length : 0;
        rowCountElement.textContent = rowCount;
    }
}

// Initialize the enlarged sheet
function initializeEnlargedSheet() {
    console.log('🔄 Initializing enlarged sheet');
    updateEnlargedSheetStats();
}

// Delete last row from enlarged sheet
function deleteLastRowFromEnlargedSheet() {
    const tbody = document.getElementById('enlargedSheetsBody');
    if (!tbody || tbody.children.length <= 1) {
        Utils.showNotification('Cannot delete the last row', 'warning');
        return;
    }
    
    const lastRow = tbody.lastElementChild;
    tbody.removeChild(lastRow);
    
    // Remove from data
    currentSheetData.pop();
    
    updateEnlargedSheetStats();
    Utils.showNotification('Last row deleted', 'success');
}

// Add new row to enlarged sheet
function addRowToEnlargedSheet() {
    const tbody = document.getElementById('enlargedSheetsBody');
    if (!tbody) return;
    
    const headers = isBulkAddMode ? 
        ['Name', 'Category', 'Price', 'Stock', 'Low Stock', 'Description'] :
        ['ID', 'Name', 'Category', 'Price', 'Stock', 'Low Stock', 'Description'];
    
    const rowIndex = tbody.children.length;
    const newRow = document.createElement('tr');
    newRow.className = 'sheet-row';
    newRow.setAttribute('data-row', rowIndex);
    
    newRow.innerHTML = headers.map((header, colIndex) => `
        <td class="sheet-cell" data-row="${rowIndex}" data-col="${colIndex}">
            ${createCellEditor('', colIndex, header, rowIndex)}
        </td>
    `).join('');
    
    tbody.appendChild(newRow);
    
    // Add empty row to data
    currentSheetData[rowIndex] = headers.map(() => '');
    
    updateEnlargedSheetStats();
    Utils.showNotification('New row added', 'success');
}

// Download enlarged sheet as CSV
function downloadEnlargedSheet() {
    const headers = isBulkAddMode ? 
        ['Name', 'Category', 'Price', 'Stock', 'Low Stock', 'Description'] :
        ['ID', 'Name', 'Category', 'Price', 'Stock', 'Low Stock', 'Description'];
    
    const data = currentSheetData.filter(row => row.some(cell => cell && cell.toString().trim() !== ''));
    const csvData = [headers, ...data];
    const csvContent = csvData.map(row => 
        row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_data_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    Utils.showNotification('Data exported as CSV', 'success');
}

// Upload CSV to enlarged sheet
function uploadEnlargedSheet() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const csvContent = event.target.result;
                const rows = csvContent.split('\n')
                    .filter(row => row.trim())
                    .map(row => 
                        row.split(',').map(cell => 
                            cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"')
                        )
                    );
                
                if (rows.length === 0) {
                    Utils.showNotification('No data found in CSV file', 'warning');
                    return;
                }
                
                // Clear current data and load new data
                currentSheetData = rows.slice(1); // Remove header row
                
                // Close and reopen enlarged sheet to refresh with new data
                closeEnlargedSheet();
                setTimeout(() => enlargeSheet(), 100);
                
                Utils.showNotification(`Imported ${currentSheetData.length} rows from CSV`, 'success');
                
            } catch (error) {
                console.error('Error parsing CSV:', error);
                Utils.showNotification('Error parsing CSV file', 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Save and close enlarged sheet
function saveEnlargedSheet() {
    // Filter out empty rows
    const validData = currentSheetData.filter(row => 
        row && row.some(cell => cell && cell.toString().trim() !== '')
    );
    
    if (validData.length === 0) {
        Utils.showNotification('No data to save', 'warning');
        return;
    }
    
    console.log('💾 Saving enlarged sheet data:', validData);
    
    // Update the main spreadsheet if it exists
    if (jspreadsheetInstance && typeof jspreadsheetInstance.setData === 'function') {
        try {
            jspreadsheetInstance.setData(validData);
        } catch (error) {
            console.error('Error updating main spreadsheet:', error);
        }
    }
    
    Utils.showNotification(`Saved ${validData.length} rows`, 'success');
    closeEnlargedSheet();
}

// Enlarge sheet to full-page Google Sheets-like interface
function enlargeSheet() {
    console.log('🔍 enlargeSheet called');
    
    // Get data from current spreadsheet or fallback
    let data = [];
    if (jspreadsheetInstance && typeof jspreadsheetInstance.getData === 'function') {
        try {
            data = jspreadsheetInstance.getData();
        } catch (error) {
            console.error('Error getting data from spreadsheet:', error);
        }
    } else {
        data = currentSheetData || [];
    }
    
    // Ensure we have at least one row for add mode
    if (isBulkAddMode && data.length === 0) {
        data = [['', '', '', '', '10', '']];
    }
    
    // Create or get the enlarged modal
    let enlargedModal = document.getElementById('enlargedSheetModal');
    if (!enlargedModal) {
        enlargedModal = document.createElement('div');
        enlargedModal.id = 'enlargedSheetModal';
        enlargedModal.className = 'modal enlarged-modal-fullpage';
        document.body.appendChild(enlargedModal);
    }
    
    // Create full-page Google Sheets-like interface
    const headers = isBulkAddMode ? 
        ['Name', 'Category', 'Price', 'Stock', 'Low Stock', 'Description'] :
        ['ID', 'Name', 'Category', 'Price', 'Stock', 'Low Stock', 'Description'];
    
    // Build the full-page interface
    enlargedModal.innerHTML = `
        <div class="fullpage-sheets-container">
            <!-- Header Bar -->
            <div class="sheets-header-bar">
                <div class="header-left">
                    <h2>${isBulkAddMode ? '📦 Bulk Add Items' : '✏️ Bulk Edit Items'}</h2>
                    <div class="header-actions">
                        <button onclick="addRowToFullPageSheet()" class="header-btn" title="Add Row">
                            <span class="btn-icon">➕</span> Add Row
                        </button>
                        <button onclick="deleteLastRowFromFullPageSheet()" class="header-btn" title="Delete Row">
                            <span class="btn-icon">➖</span> Delete Row
                        </button>
                        <button onclick="addSampleToFullPageSheet()" class="header-btn" title="Add Sample">
                            <span class="btn-icon">⭐</span> Sample
                        </button>
                    </div>
                </div>
                <div class="header-right">
                    <button onclick="downloadFullPageSheet()" class="header-btn secondary" title="Download CSV">
                        <span class="btn-icon">📥</span> Export
                    </button>
                    <button onclick="uploadFullPageSheet()" class="header-btn secondary" title="Upload CSV">
                        <span class="btn-icon">📤</span> Import
                    </button>
                    <button onclick="closeFullPageSheet()" class="header-btn close" title="Close">
                        <span class="btn-icon">✕</span> Close
                    </button>
                </div>
            </div>

            <!-- Toolbar -->
            <div class="sheets-toolbar-fullpage">
                <div class="toolbar-section">
                    <span class="toolbar-label">Quick Actions:</span>
                    <button onclick="clearAllData()" class="toolbar-btn small">Clear All</button>
                    <button onclick="validateFullPageData()" class="toolbar-btn small">Validate Data</button>
                </div>
                <div class="toolbar-section">
                    <span class="toolbar-label">Stats:</span>
                    <span class="stat-badge" id="fullPageRowCount">Rows: ${data.length}</span>
                    <span class="stat-badge" id="fullPageColCount">Columns: ${headers.length}</span>
                </div>
            </div>

            <!-- Instructions -->
            <div class="fullpage-instructions">
                <div class="instructions-content">
                    <strong>💡 How to use this spreadsheet:</strong>
                    <ul>
                        <li>Edit cells directly - changes are auto-saved</li>
                        <li><strong>Required fields:</strong> Name</li> <!-- REMOVED: Price, Stock -->
                        <li>Use dropdown menus for Category selection</li>
                        <li>Add/remove rows as needed using the toolbar</li>
                        <li>Import/Export CSV files for bulk operations</li>
                    </ul>
                </div>
            </div>

            <!-- Main Spreadsheet Area -->
            <div class="sheets-main-area">
                <div class="sheets-table-wrapper">
                    <table class="fullpage-sheets-table" id="fullPageSheetsTable">
                        <thead>
                            <tr class="sheets-header-row">
                                ${headers.map((header, index) => `
                                    <th class="fullpage-header-cell" data-col="${index}">
                                        <div class="header-cell-content">
                                            <span class="header-text">${header}</span>
                                            ${header === 'Name' ? '<span class="required-indicator">*</span>' : ''} <!-- ONLY Name is required -->
                                        </div>
                                    </th>
                                `).join('')}
                            </tr>
                        </thead>
                        <tbody id="fullPageSheetsBody">
                            ${data.map((row, rowIndex) => `
                                <tr class="fullpage-data-row" data-row="${rowIndex}">
                                    ${row.map((cell, colIndex) => `
                                        <td class="fullpage-data-cell" data-row="${rowIndex}" data-col="${colIndex}">
                                            <div class="cell-container">
                                                ${createFullPageCellEditor(cell, colIndex, headers[colIndex], rowIndex)}
                                            </div>
                                        </td>
                                    `).join('')}
                                </tr>
                            `).join('')}
                            ${data.length === 0 ? `
                                <tr class="fullpage-data-row" data-row="0">
                                    ${headers.map((header, colIndex) => `
                                        <td class="fullpage-data-cell" data-row="0" data-col="${colIndex}">
                                            <div class="cell-container">
                                                ${createFullPageCellEditor('', colIndex, header, 0)}
                                            </div>
                                        </td>
                                    `).join('')}
                                </tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Footer -->
            <div class="fullpage-footer">
                <div class="footer-left">
                    <span class="footer-text">Ready • All changes are auto-saved</span>
                </div>
                <div class="footer-right">
                    <button onclick="saveAndCloseFullPageSheet()" class="footer-btn primary">
                        <span class="btn-icon">💾</span> Save & Close
                    </button>
                </div>
            </div>
        </div>
    `;

    // Show the modal
    enlargedModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Initialize the full page sheet
    initializeFullPageSheet();
    console.log('✅ Full-page sheet opened successfully');
}

function createFullPageCellEditor(value, colIndex, header, rowIndex) {
    const cellValue = value || '';
    
    if (header === 'Category') {
        return `
            <select class="fullpage-cell-input fullpage-dropdown" 
                    onchange="updateFullPageSheetData(${rowIndex}, ${colIndex}, this.value)"
                    onfocus="highlightCell(${rowIndex}, ${colIndex})">
                <option value="">Select Category</option>
                ${categories.map(cat => `
                    <option value="${cat}" ${cellValue === cat ? 'selected' : ''}>
                        ${getCategoryLabel(cat)}
                    </option>
                `).join('')}
            </select>
        `;
    } else if (header === 'Price') {
        return `
            <div class="currency-input-container">
                <span class="currency-symbol">₹</span>
                <input type="text" 
                       class="fullpage-cell-input" 
                       value="${cellValue}" 
                       onchange="updateFullPageSheetData(${rowIndex}, ${colIndex}, this.value)"
                       onfocus="highlightCell(${rowIndex}, ${colIndex})"
                       placeholder="Enter price">
            </div>
        `;
    } else if (header === 'Stock' || header === 'Low Stock') {
        return `
            <input type="number" 
                   class="fullpage-cell-input" 
                   value="${cellValue}" 
                   onchange="updateFullPageSheetData(${rowIndex}, ${colIndex}, this.value)"
                   onfocus="highlightCell(${rowIndex}, ${colIndex})"
                   placeholder="Enter ${header.toLowerCase()}">
        `;
    } else if (header === 'Description') {
        return `
            <textarea class="fullpage-cell-input fullpage-textarea" 
                      onchange="updateFullPageSheetData(${rowIndex}, ${colIndex}, this.value)"
                      onfocus="highlightCell(${rowIndex}, ${colIndex})"
                      placeholder="Enter description">${cellValue}</textarea>
        `;
    } else if (header === 'ID') {
        return `
            <span class="fullpage-id-cell">${cellValue || 'Auto-generated'}</span>
        `;
    } else {
        return `
            <input type="text" 
                   class="fullpage-cell-input" 
                   value="${cellValue}" 
                   onchange="updateFullPageSheetData(${rowIndex}, ${colIndex}, this.value)"
                   onfocus="highlightCell(${rowIndex}, ${colIndex})"
                   placeholder="Enter ${header.toLowerCase()}">
        `;
    }
}

// Initialize full page sheet
function initializeFullPageSheet() {
    console.log('🔄 Initializing full page sheet');
    updateFullPageStats();
    attachCellEventListeners();
}

// Update full page sheet data
function updateFullPageSheetData(rowIndex, colIndex, value) {
    console.log(`📝 Updating cell [${rowIndex},${colIndex}] to:`, value);
    
    if (!currentSheetData[rowIndex]) {
        currentSheetData[rowIndex] = [];
    }
    currentSheetData[rowIndex][colIndex] = value;
    
    // Update main spreadsheet if exists
    if (jspreadsheetInstance && typeof jspreadsheetInstance.setValue === 'function') {
        try {
            jspreadsheetInstance.setValueFromCoords(colIndex, rowIndex, value);
        } catch (error) {
            console.error('Error updating main spreadsheet:', error);
        }
    }
    
    // Visual feedback
    highlightCell(rowIndex, colIndex, true);
}

// Highlight cell on focus
function highlightCell(rowIndex, colIndex, isUpdated = false) {
    const cell = document.querySelector(`.fullpage-data-cell[data-row="${rowIndex}"][data-col="${colIndex}"]`);
    if (cell) {
        cell.classList.add(isUpdated ? 'cell-updated' : 'cell-focused');
        
        // Remove highlight after delay for updates
        if (isUpdated) {
            setTimeout(() => {
                cell.classList.remove('cell-updated');
            }, 1000);
        }
    }
}

// Add new row to full page sheet
function addRowToFullPageSheet() {
    const tbody = document.getElementById('fullPageSheetsBody');
    if (!tbody) return;
    
    const headers = isBulkAddMode ? 
        ['Name', 'Category', 'Price', 'Stock', 'Low Stock', 'Description'] :
        ['ID', 'Name', 'Category', 'Price', 'Stock', 'Low Stock', 'Description'];
    
    const rowIndex = tbody.children.length;
    const newRow = document.createElement('tr');
    newRow.className = 'fullpage-data-row';
    newRow.setAttribute('data-row', rowIndex);
    
    newRow.innerHTML = headers.map((header, colIndex) => `
        <td class="fullpage-data-cell" data-row="${rowIndex}" data-col="${colIndex}">
            <div class="cell-container">
                ${createFullPageCellEditor('', colIndex, header, rowIndex)}
            </div>
        </td>
    `).join('');
    
    tbody.appendChild(newRow);
    
    // Add empty row to data
    currentSheetData[rowIndex] = headers.map(() => '');
    
    updateFullPageStats();
    Utils.showNotification('New row added', 'success');
}

// Delete last row from full page sheet
function deleteLastRowFromFullPageSheet() {
    const tbody = document.getElementById('fullPageSheetsBody');
    if (!tbody || tbody.children.length <= 1) {
        Utils.showNotification('Cannot delete the last row', 'warning');
        return;
    }
    
    const lastRow = tbody.lastElementChild;
    tbody.removeChild(lastRow);
    
    // Remove from data
    currentSheetData.pop();
    
    updateFullPageStats();
    Utils.showNotification('Last row deleted', 'success');
}

// Add sample data
function addSampleToFullPageSheet() {
    const sampleRow = isBulkAddMode ? 
        ['Sample Item', 'electronics', '99.99', '50', '10', 'This is a sample item description'] :
        ['', 'Sample Item', 'electronics', '99.99', '50', '10', 'This is a sample item description'];
    
    addRowToFullPageSheet();
    
    // Update the new row with sample data
    const tbody = document.getElementById('fullPageSheetsBody');
    const lastRow = tbody.lastElementChild;
    const cells = lastRow.querySelectorAll('.fullpage-data-cell');
    
    sampleRow.forEach((value, index) => {
        if (index < cells.length) {
            const input = cells[index].querySelector('.fullpage-cell-input, .fullpage-dropdown, .fullpage-textarea');
            if (input) {
                input.value = value;
                updateFullPageSheetData(tbody.children.length - 1, index, value);
            }
        }
    });
    
    Utils.showNotification('Sample row added', 'success');
}

// Update statistics
function updateFullPageStats() {
    const rowCountElement = document.getElementById('fullPageRowCount');
    const colCountElement = document.getElementById('fullPageColCount');
    
    if (rowCountElement) {
        const tbody = document.getElementById('fullPageSheetsBody');
        const rowCount = tbody ? tbody.children.length : 0;
        rowCountElement.textContent = `Rows: ${rowCount}`;
    }
    
    if (colCountElement) {
        const headers = isBulkAddMode ? 6 : 7;
        colCountElement.textContent = `Columns: ${headers}`;
    }
}

// Upload CSV
function uploadFullPageSheet() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const csvContent = event.target.result;
                const rows = csvContent.split('\n')
                    .filter(row => row.trim())
                    .map(row => 
                        row.split(',').map(cell => 
                            cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"')
                        )
                    );
                
                if (rows.length === 0) {
                    Utils.showNotification('No data found in CSV file', 'warning');
                    return;
                }
                
                // Clear current data and load new data
                currentSheetData = rows.slice(1); // Remove header row
                
                // Refresh the full page sheet
                closeFullPageSheet();
                setTimeout(() => enlargeSheet(), 100);
                
                Utils.showNotification(`Imported ${currentSheetData.length} rows from CSV`, 'success');
                
            } catch (error) {
                console.error('Error parsing CSV:', error);
                Utils.showNotification('Error parsing CSV file', 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Save and close
function saveAndCloseFullPageSheet() {
    const validData = currentSheetData.filter(row => 
        row && row.some(cell => cell && cell.toString().trim() !== '')
    );
    
    if (validData.length === 0) {
        Utils.showNotification('No data to save', 'warning');
        return;
    }
    
    console.log('💾 Saving full page sheet data:', validData);
    
    // Update main spreadsheet
    if (jspreadsheetInstance && typeof jspreadsheetInstance.setData === 'function') {
        try {
            jspreadsheetInstance.setData(validData);
        } catch (error) {
            console.error('Error updating main spreadsheet:', error);
        }
    }
    
    Utils.showNotification(`Saved ${validData.length} rows`, 'success');
    closeFullPageSheet();
}

// Close full page sheet
function closeFullPageSheet() {
    const enlargedModal = document.getElementById('enlargedSheetModal');
    if (enlargedModal) {
        enlargedModal.classList.add('hidden');
    }
    document.body.style.overflow = ''; // Restore scrolling
}

// Attach event listeners to cells
function attachCellEventListeners() {
    // Add focus/blur events to all inputs
    setTimeout(() => {
        const inputs = document.querySelectorAll('.fullpage-cell-input');
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                const cell = this.closest('.fullpage-data-cell');
                if (cell) {
                    cell.classList.add('cell-focused');
                }
            });
            
            input.addEventListener('blur', function() {
                const cell = this.closest('.fullpage-data-cell');
                if (cell) {
                    cell.classList.remove('cell-focused');
                }
            });
        });
    }, 100);
}

// Clear all data
function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        currentSheetData = [];
        closeFullPageSheet();
        setTimeout(() => enlargeSheet(), 100);
        Utils.showNotification('All data cleared', 'success');
    }
}

// Validate data - REMOVED PRICE/STOCK VALIDATION
function validateFullPageData() {
    const validData = currentSheetData.filter(row => 
        row && row.some(cell => cell && cell.toString().trim() !== '')
    );
    
    if (validData.length === 0) {
        Utils.showNotification('No data to validate', 'warning');
        return;
    }
    
    let errorCount = 0;
    validData.forEach((row, index) => {
        if (!row[0] || !row[0].toString().trim()) {
            errorCount++;
            console.error(`Row ${index + 1}: Name is required`);
        }
        // REMOVED: Price validation
        // REMOVED: Stock validation
    });
    
    if (errorCount === 0) {
        Utils.showNotification(`All ${validData.length} rows are valid!`, 'success');
    } else {
        Utils.showNotification(`Found ${errorCount} validation errors. Check console for details.`, 'error');
    }
}

// Download as CSV
function downloadFullPageSheet() {
    const headers = isBulkAddMode ? 
        ['Name', 'Category', 'Price', 'Stock', 'Low Stock', 'Description'] :
        ['ID', 'Name', 'Category', 'Price', 'Stock', 'Low Stock', 'Description'];
    
    const data = currentSheetData.filter(row => row.some(cell => cell && cell.toString().trim() !== ''));
    const csvData = [headers, ...data];
    const csvContent = csvData.map(row => 
        row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_bulk_${isBulkAddMode ? 'add' : 'edit'}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    Utils.showNotification('Data exported as CSV', 'success');
}

// Download CSV from enlarged view
function downloadEnlargedCSV() {
    const csvTextarea = document.getElementById('enlargedCSVData');
    if (!csvTextarea) return;
    
    const csvContent = csvTextarea.value;
    const fileName = isBulkAddMode ? 'bulk_add_template.csv' : 'bulk_edit_data.csv';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    Utils.showNotification(`Downloaded ${fileName}`, 'success');
}

// Add sample row to enlarged view
function addSampleToEnlarged() {
    const csvTextarea = document.getElementById('enlargedCSVData');
    if (!csvTextarea) return;
    
    const sampleRow = isBulkAddMode ? 
        ['Sample Item', 'electronics', '99.99', '50', '10', 'This is a sample item description'] :
        ['', 'Sample Item', 'electronics', '99.99', '50', '10', 'This is a sample item description'];
    
    const currentContent = csvTextarea.value.trim();
    const newLine = currentContent ? '\n' : '';
    const newRow = sampleRow.map(cell => `"${cell}"`).join(',');
    csvTextarea.value = currentContent + newLine + newRow;
    
    Utils.showNotification('Sample row added', 'success');
}

// Sync data back from enlarged view
function syncFromEnlargedSheet() {
    const csvTextarea = document.getElementById('enlargedCSVData');
    if (!csvTextarea) {
        Utils.showNotification('No data found in enlarged view', 'error');
        return;
    }
    
    const csvData = csvTextarea.value;
    if (!csvData.trim()) {
        Utils.showNotification('Please enter some data', 'warning');
        return;
    }
    
    try {
        // Parse CSV data
        const rows = csvData.split('\n')
            .filter(row => row.trim()) // Remove empty rows
            .map(row => 
                row.split(',').map(cell => 
                    cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"')
                )
            );
        
        // Remove header row
        const headers = rows.shift();
        const data = rows.filter(row => row.some(cell => cell && cell.trim() !== ''));
        
        if (data.length === 0) {
            Utils.showNotification('No valid data found', 'warning');
            return;
        }
        
        // Update the main spreadsheet or currentSheetData
        currentSheetData = data;
        
        // If we have a spreadsheet instance, update it
        if (jspreadsheetInstance && typeof jspreadsheetInstance.setData === 'function') {
            jspreadsheetInstance.setData(data);
        }
        
        Utils.showNotification(`Synced ${data.length} rows from enlarged view`, 'success');
        closeEnlargedSheet();
        
        // Reopen the sheet modal to show updated data
        showSheetModal();
        
    } catch (error) {
        console.error('Error parsing CSV data:', error);
        Utils.showNotification('Error parsing CSV data. Please check the format.', 'error');
    }
}

// Close modal and clean up instance
function closeSheetModal() {
    const modal = document.getElementById('sheetModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // Clean up spreadsheet instance
    if (jspreadsheetInstance && typeof jspreadsheetInstance.destroy === 'function') {
        try {
            jspreadsheetInstance.destroy();
        } catch (error) {
            console.error('Error destroying spreadsheet:', error);
        }
    }
    jspreadsheetInstance = null;
    currentSheetData = [];
}

// Improved close function
function closeEnlargedSheet() {
    const enlargedModal = document.getElementById('enlargedSheetModal');
    if (enlargedModal) {
        enlargedModal.classList.add('hidden');
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

// Update the bulk add stock function to handle empty values
async function bulkAddStock() {
    if (selectedItems.size === 0) {
        Utils.showNotification('Please select items to add stock', 'warning');
        return;
    }

    const quantity = prompt(`Enter quantity to add to ${selectedItems.size} selected items:`, "10");
    if (!quantity || quantity.trim() === '') {
        Utils.showNotification('Please enter a quantity', 'warning');
        return;
    }

    const quantityValue = parseInt(quantity) || 0;

    try {
        const updatePromises = Array.from(selectedItems).map(async (itemId) => {
            const item = allItems.find(i => i.id === itemId);
            if (item) {
                const currentStock = item.stock || 0;
                return SupabaseService.updateItem(itemId, {
                    stock: currentStock + quantityValue,
                    updated_at: new Date().toISOString()
                });
            }
        });

        await Promise.all(updatePromises);
        Utils.showNotification(`Added ${quantityValue} stock to ${selectedItems.size} items`, 'success');
        clearSelection();
        await loadInventory();
    } catch (error) {
        console.error('Error adding stock:', error);
        Utils.showNotification('Error adding stock to items', 'error');
    }
}

// Add a helper function to safely parse numbers
function safeParseInt(value, defaultValue = 0) {
    if (value === null || value === undefined || value === '') {
        return defaultValue;
    }
    const parsed = parseInt(value);
    return isNaN(parsed) ? defaultValue : parsed;
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

function closeCreateCategoryModal() {
    const modal = document.getElementById('createCategoryModal');
    if (modal) {
        modal.classList.add('hidden');
    }
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

// Update the summary function to handle price defaults
function updateInventorySummary(items) {
    const summaryElement = document.getElementById('inventorySummary');
    if (!summaryElement) return;

    const totalItems = items.length;
    const totalStock = items.reduce((sum, item) => sum + (item.stock || 0), 0);
    const totalValue = items.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (item.stock || 0)), 0);
    const outOfStock = items.filter(item => (item.stock || 0) === 0).length;
    const lowStock = items.filter(item => {
        const threshold = item.low_stock_threshold || 10;
        return (item.stock || 0) >= 0 && (item.stock || 0) <= threshold;
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

function closeEditItemPage() {
    const editPage = document.getElementById('editItemPage');
    if (editPage) {
        editPage.remove();
    }
    editingItemId = null;
    
    // Show the inventory page
    Navigation.showPage('inventory');
}

// Update the reset edit form function to handle defaults
function resetEditItemForm() {
    const item = allItems.find(i => i.id === editingItemId);
    if (item) {
        document.getElementById('editItemName').value = item.name;
        document.getElementById('editItemPrice').value = item.price || '0'; // Default to '0'
        document.getElementById('editItemStock').value = item.stock || '0'; // Default to '0'
        document.getElementById('editItemLowStock').value = item.low_stock_threshold || 10;
        document.getElementById('editItemCategory').value = item.category || '';
        document.getElementById('editItemDescription').value = item.description || '';
    }
}

// In the edit item form submission - provide default for price
async function handleEditItemSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('editItemSubmitText').closest('button');
    Utils.showLoading(submitBtn);

    try {
        const itemData = {
            name: document.getElementById('editItemName').value.trim(),
            price: document.getElementById('editItemPrice').value || '0', // Default to '0' instead of null
            stock: document.getElementById('editItemStock').value ? parseInt(document.getElementById('editItemStock').value) : 0,
            low_stock_threshold: document.getElementById('editItemLowStock').value ? parseInt(document.getElementById('editItemLowStock').value) : 10,
            category: document.getElementById('editItemCategory').value || null,
            description: document.getElementById('editItemDescription').value.trim() || null,
            updated_at: new Date().toISOString()
        };

        // Validate required fields - ONLY NAME REMAINS
        if (!itemData.name) {
            Utils.showNotification('Item name is required', 'warning');
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

// In the create item form submission - provide default for price
function updateCreateItemFormSubmission() {
    const createForm = document.getElementById('itemForm');
    if (createForm) {
        // Remove any existing event listeners
        const newForm = createForm.cloneNode(true);
        createForm.parentNode.replaceChild(newForm, createForm);

        // Add new event listener
        newForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('itemSubmitText')?.closest('button');
            Utils.showLoading(submitBtn);

            try {
                const itemData = {
                    name: document.getElementById('itemName').value.trim(),
                    price: document.getElementById('itemPrice').value || '0', // Default to '0' instead of null
                    stock: document.getElementById('itemStock').value ? parseInt(document.getElementById('itemStock').value) : 0,
                    low_stock_threshold: document.getElementById('itemLowStock')?.value ? parseInt(document.getElementById('itemLowStock')?.value) : 10,
                    category: document.getElementById('itemCategory').value || null,
                    description: document.getElementById('itemDescription')?.value.trim() || null,
                    created_at: new Date().toISOString()
                };

                // Validate required fields - ONLY NAME REMAINS
                if (!itemData.name) {
                    Utils.showNotification('Item name is required', 'warning');
                    Utils.hideLoading(submitBtn);
                    return;
                }

                await SupabaseService.createItem(itemData);
                resetItemForm();
                Navigation.showPage('inventory');
                
            } catch (error) {
                console.error('Error creating item:', error);
                Utils.showNotification('Error creating item: ' + error.message, 'error');
            } finally {
                Utils.hideLoading(submitBtn);
            }
        });
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize create item form
    initializeCreateItemForm();
    updateCreateItemFormSubmission();

    // Check if we're on the inventory page and load data
    if (document.getElementById('inventory') && !document.getElementById('inventory').classList.contains('hidden')) {
        loadInventory();
    }
});

// Update the reset form function to set default price
function resetItemForm() {
    const form = document.getElementById('itemForm');
    if (form) {
        form.reset();
        // Set default values for specific fields
        const priceField = document.getElementById('itemPrice');
        if (priceField) {
            priceField.value = '0'; // Set default price
        }
        const lowStockField = document.getElementById('itemLowStock');
        if (lowStockField) {
            lowStockField.value = '10';
        }
    }
}

// Initialize categories from localStorage or use defaults
function initializeCategories() {
    const savedCategories = localStorage.getItem('inventoryCategories');
    if (savedCategories) {
        categories = JSON.parse(savedCategories);
    } else {
        // Default categories
        categories = ['electronics', 'clothing', 'furniture', 'groceries', 'books', 'other'];
        saveCategories();
    }
}

// Save categories to localStorage
function saveCategories() {
    localStorage.setItem('inventoryCategories', JSON.stringify(categories));
}

// Also update the createNewCategory function to refresh the list if manage modal is open
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

    // Add to categories array and save
    categories.push(categoryKey);
    saveCategories();
    
    // Refresh all category dropdowns
    refreshAllCategoryDropdowns();
    
    // Refresh categories list if manage modal is open
    const manageModal = document.getElementById('manageCategoriesModal');
    if (manageModal && !manageModal.classList.contains('hidden')) {
        refreshCategoriesList();
    }
    
    Utils.showNotification(`Category "${categoryName}" created successfully`, 'success');
    closeCreateCategoryModal();
}

// Function to refresh all category dropdowns in the application
function refreshAllCategoryDropdowns() {
    // Refresh inventory page category filter
    populateCategoryFilter();
    
    // Refresh create item form category dropdown
    refreshCreateItemCategoryDropdown();
    
    // Refresh edit item form category dropdown (if open)
    refreshEditItemCategoryDropdown();
    
    // Refresh spreadsheet category dropdowns (if any are open)
    refreshSpreadsheetCategoryDropdowns();
}

// Refresh create item form category dropdown
function refreshCreateItemCategoryDropdown() {
    const categorySelect = document.getElementById('itemCategory');
    if (categorySelect) {
        categorySelect.innerHTML = `
            <option value="">Select Category</option>
            ${categories.map(cat => `
                <option value="${cat}">${getCategoryLabel(cat)}</option>
            `).join('')}
        `;
    }
}

// Refresh edit item form category dropdown
function refreshEditItemCategoryDropdown() {
    const categorySelect = document.getElementById('editItemCategory');
    if (categorySelect) {
        // Get current value to preserve selection
        const currentValue = categorySelect.value;
        categorySelect.innerHTML = `
            <option value="">Select Category</option>
            ${categories.map(cat => `
                <option value="${cat}">${getCategoryLabel(cat)}</option>
            `).join('')}
        `;
        // Restore selection if it still exists
        if (currentValue && categories.includes(currentValue)) {
            categorySelect.value = currentValue;
        }
    }
}

// Refresh spreadsheet category dropdowns
function refreshSpreadsheetCategoryDropdowns() {
    // If spreadsheet is initialized, update its category column
    if (jspreadsheetInstance) {
        // We need to reinitialize the spreadsheet with updated categories
        // This is a bit complex, so we'll handle it when the spreadsheet is reopened
        console.log('Categories updated - spreadsheet will reflect changes when reopened');
    }
    
    // Update any open enlarged sheet category dropdowns
    const enlargedCategoryDropdowns = document.querySelectorAll('.fullpage-dropdown, .sheet-select');
    enlargedCategoryDropdowns.forEach(dropdown => {
        if (dropdown.innerHTML.includes('Select Category')) {
            const currentValue = dropdown.value;
            dropdown.innerHTML = `
                <option value="">Select Category</option>
                ${categories.map(cat => `
                    <option value="${cat}">${getCategoryLabel(cat)}</option>
                `).join('')}
            `;
            if (currentValue && categories.includes(currentValue)) {
                dropdown.value = currentValue;
            }
        }
    });
}

// Update the populateCategoryFilter function to use the categories array
function populateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;

    categoryFilter.innerHTML = `
        <option value="all">All Categories</option>
        ${categories.map(cat => `
            <option value="${cat}">${getCategoryLabel(cat)}</option>
        `).join('')}
    `;
}

// Update the getCategoryLabel function to handle any category
function getCategoryLabel(category) {
    if (!category) return 'Uncategorized';
    
    // If it's already a formatted label, return as is
    if (category === 'Uncategorized' || category === 'uncategorized') {
        return 'Uncategorized';
    }
    
    // Convert snake_case to Title Case
    const formatted = category
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    return formatted || 'Uncategorized';
}

// Update the showCreateCategoryModal function
function showCreateCategoryModal() {
    const modal = document.getElementById('createCategoryModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('newCategoryName').value = '';
        document.getElementById('newCategoryName').focus();
    }
}

// Update the initializeCreateItemForm to ensure category dropdown is populated
function initializeCreateItemForm() {
    const createForm = document.getElementById('itemForm');
    if (createForm) {
        // Ensure categories are initialized
        initializeCategories();
        
        // Check if low stock field already exists
        if (!document.getElementById('itemLowStock')) {
            // Add low stock field after stock field
            const stockGroup = document.getElementById('itemStock')?.closest('.form-group');
            if (stockGroup) {
                const lowStockHTML = `
                    <div class="form-group">
                        <label for="itemLowStock">Low Stock Threshold</label>
                        <input type="number" id="itemLowStock" step="1" value="10" placeholder="10">
                        <div class="form-hint">Alert when stock reaches this level</div>
                    </div>
                `;
                stockGroup.insertAdjacentHTML('afterend', lowStockHTML);
            }
        }

        // Ensure description field exists
        if (!document.getElementById('itemDescription')) {
            const categoryGroup = document.getElementById('itemCategory')?.closest('.form-group');
            if (categoryGroup) {
                const descriptionHTML = `
                    <div class="form-group full-width">
                        <label for="itemDescription">Description (Optional)</label>
                        <textarea id="itemDescription" rows="3" placeholder="Enter item description..." maxlength="500"></textarea>
                        <div class="form-hint">Optional description for the item</div>
                    </div>
                `;
                categoryGroup.insertAdjacentHTML('afterend', descriptionHTML);
            }
        }
        
        // Ensure category dropdown is populated
        refreshCreateItemCategoryDropdown();
        
        // Update the stock field to enforce integers
        const stockField = document.getElementById('itemStock');
        if (stockField) {
            stockField.type = 'number';
            stockField.step = '1';
        }
    }
}

// Update the showEditItemPage function to ensure category dropdown is populated
function showEditItemPage(item) {
    // Ensure categories are initialized
    initializeCategories();
    
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
                            <label for="editItemPrice">Price (₹)</label>
                            <div class="input-with-icon">
                                <span class="input-icon">₹</span>
                                <input type="text" id="editItemPrice"
                                       value="${item.price || '0'}"
                                       placeholder="Enter price">
                            </div>
                            <div class="form-hint">Enter the selling price per unit</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="editItemStock">Current Stock</label>
                            <input type="number" id="editItemStock" step="1"
                                   value="${item.stock || '0'}"
                                   placeholder="Enter stock quantity">
                            <div class="form-hint">Current quantity in stock (whole numbers only)</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="editItemLowStock">Low Stock Threshold</label>
                            <input type="number" id="editItemLowStock" step="1"
                                   value="${item.low_stock_threshold || 10}"
                                   placeholder="10">
                            <div class="form-hint">Alert when stock reaches this level (whole numbers only)</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="editItemCategory">Category</label>
                            <select id="editItemCategory">
                                <option value="">Select Category</option>
                                ${categories.map(cat => `
                                    <option value="${cat}" ${item.category === cat ? 'selected' : ''}>${getCategoryLabel(cat)}</option>
                                `).join('')}
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

// Update the initializeSpreadsheet function to use current categories
function initializeSpreadsheet(data, isAddMode) {
    const container = document.getElementById('spreadsheet');
    if (!container) {
        console.error('Spreadsheet container not found!');
        Utils.showNotification('Spreadsheet container not found', 'error');
        return false;
    }
    
    // Clear container first
    container.innerHTML = '';
    
    // Check if jspreadsheet is available
    if (typeof jspreadsheet === 'undefined' && typeof window.jexcel === 'undefined') {
        console.error('Spreadsheet library not loaded');
        showFallbackSpreadsheet(data, isAddMode);
        return false;
    }

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
            source: categories, // Use the current categories array
            autocomplete: true
        },
        { 
            title: 'Price', 
            width: 100, 
            type: 'text'
        },
        { 
            title: 'Stock', 
            width: 80, 
            type: 'numeric',
            mask: '#,##0',
            decimal: ''
        },
        { 
            title: 'Low Stock', 
            width: 100, 
            type: 'numeric',
            mask: '#,##0',
            decimal: ''
        },
        { 
            title: 'Description', 
            width: 200, 
            type: 'text'
        }
    ];

    // If in add mode, remove ID column
    if (isAddMode) {
        columns.shift(); // Remove ID column
        if (data.length === 0) {
            data = [['', '', '', '', '10', '']]; // One empty row
        }
    }

    try {
        // Try different ways to initialize the spreadsheet
        let spreadsheet;
        
        // Method 1: Try jspreadsheet as function
        if (typeof jspreadsheet === 'function') {
            spreadsheet = jspreadsheet(container, {
                data: data,
                columns: columns,
                minDimensions: [columns.length, 10],
                tableOverflow: true,
                tableWidth: "100%",
                tableHeight: "400px",
                onchange: updateSheetData,
                oninsertrow: updateSheetData,
                ondeleterow: updateSheetData
            });
        } 
        // Store the instance globally
        jspreadsheetInstance = spreadsheet;
        currentSheetData = data;
        
        console.log('✅ Spreadsheet initialized successfully');
        return true;
        
    } catch (error) {
        console.error('Error initializing spreadsheet:', error);
        console.log('Available jspreadsheet:', jspreadsheet);
        console.log('Available jexcel:', window.jexcel);
        
        // Fallback to CSV textarea
        showFallbackSpreadsheet(data, isAddMode);
        return false;
    }
}

// Update the page initialization to include categories
document.addEventListener('DOMContentLoaded', function() {
    // Initialize categories first
    initializeCategories();
    
    // Initialize create item form
    initializeCreateItemForm();
    updateCreateItemFormSubmission();

    // Check if we're on the inventory page and load data
    if (document.getElementById('inventory') && !document.getElementById('inventory').classList.contains('hidden')) {
        loadInventory();
    }
});

// Enhanced category management modal with edit and delete options
function showManageCategoriesModal() {
    const modal = document.getElementById('manageCategoriesModal');
    if (!modal) {
        // Create the modal if it doesn't exist
        const modalHTML = `
            <div class="modal" id="manageCategoriesModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>📁 Manage Categories</h2>
                        <button onclick="closeManageCategoriesModal()" class="close-btn">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="categories-management">
                            <div class="categories-list-section">
                                <h3>Current Categories</h3>
                                <div class="categories-instruction">
                                    <p>Click on a category name to edit it, or use the buttons to manage.</p>
                                </div>
                                <div id="categoriesList" class="categories-container">
                                    ${categories.map(cat => `
                                        <div class="category-item" data-category="${cat}">
                                            <span class="category-name" onclick="editCategoryName('${cat}')">${getCategoryLabel(cat)}</span>
                                            <div class="category-actions">
                                                <button onclick="editCategory('${cat}')" class="action-btn edit-category-btn" title="Edit Category">✏️</button>
                                                <button onclick="deleteCategory('${cat}')" class="action-btn delete-category-btn" title="Delete Category">🗑️</button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div class="add-category-section">
                                <h3>Add New Category</h3>
                                <div class="add-category-form">
                                    <input type="text" id="newCategoryInput" placeholder="Enter new category name" maxlength="50">
                                    <button onclick="addCategoryFromManage()" class="confirm-btn">➕ Add Category</button>
                                </div>
                            </div>
                        </div>
                        <div class="modal-actions">
                            <button onclick="closeManageCategoriesModal()" class="cancel-btn">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } else {
        // Update the categories list
        refreshCategoriesList();
    }
    
    document.getElementById('manageCategoriesModal').classList.remove('hidden');
    // Focus on the new category input
    setTimeout(() => {
        const newCategoryInput = document.getElementById('newCategoryInput');
        if (newCategoryInput) newCategoryInput.focus();
    }, 100);
}

// Add category from manage modal
function addCategoryFromManage() {
    const newCategoryInput = document.getElementById('newCategoryInput');
    if (!newCategoryInput) return;
    
    const categoryName = newCategoryInput.value.trim();
    
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

    // Add to categories array and save
    categories.push(categoryKey);
    saveCategories();
    
    // Refresh all category dropdowns
    refreshAllCategoryDropdowns();
    
    // Refresh the categories list
    refreshCategoriesList();
    
    // Clear input
    newCategoryInput.value = '';
    newCategoryInput.focus();
    
    Utils.showNotification(`Category "${categoryName}" created successfully`, 'success');
}

// Refresh the categories list in the modal
function refreshCategoriesList() {
    const categoriesList = document.getElementById('categoriesList');
    if (categoriesList) {
        categoriesList.innerHTML = categories.map(cat => `
            <div class="category-item" data-category="${cat}">
                <span class="category-name" onclick="editCategoryName('${cat}')">${getCategoryLabel(cat)}</span>
                <div class="category-actions">
                    <button onclick="editCategory('${cat}')" class="action-btn edit-category-btn" title="Edit Category">✏️</button>
                    <button onclick="deleteCategory('${cat}')" class="action-btn delete-category-btn" title="Delete Category">🗑️</button>
                </div>
            </div>
        `).join('');
    }
}

// Edit category (opens edit modal)
function editCategory(categoryKey) {
    const currentName = getCategoryLabel(categoryKey);
    
    // Create edit modal
    const editModalHTML = `
        <div class="modal" id="editCategoryModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>✏️ Edit Category</h2>
                    <button onclick="closeEditCategoryModal()" class="close-btn">×</button>
                </div>
                <div class="modal-body">
                    <div class="edit-category-form">
                        <div class="form-group">
                            <label for="editCategoryName">Category Name</label>
                            <input type="text" id="editCategoryName" value="${currentName}" placeholder="Enter category name" maxlength="50">
                        </div>
                        <div class="form-hint">
                            Current key: <code>${categoryKey}</code>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button onclick="closeEditCategoryModal()" class="cancel-btn">Cancel</button>
                        <button onclick="saveCategory('${categoryKey}')" class="confirm-btn">💾 Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing edit modal if any
    const existingModal = document.getElementById('editCategoryModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', editModalHTML);
    
    // Focus on the input
    setTimeout(() => {
        const input = document.getElementById('editCategoryName');
        if (input) {
            input.focus();
            input.select();
        }
    }, 100);
}

// Close edit category modal
function closeEditCategoryModal() {
    const modal = document.getElementById('editCategoryModal');
    if (modal) {
        modal.remove();
    }
}

// Edit category name (inline editing)
function editCategoryName(oldCategoryKey) {
    const categoryItem = document.querySelector(`.category-item[data-category="${oldCategoryKey}"]`);
    if (!categoryItem) return;
    
    const categoryNameSpan = categoryItem.querySelector('.category-name');
    const currentName = getCategoryLabel(oldCategoryKey);
    
    categoryNameSpan.innerHTML = `
        <div class="category-edit-form">
            <input type="text" class="category-edit-input" value="${currentName}" maxlength="50">
            <div class="category-edit-actions">
                <button onclick="saveCategoryEdit('${oldCategoryKey}')" class="confirm-btn small">💾</button>
                <button onclick="cancelCategoryEdit('${oldCategoryKey}')" class="cancel-btn small">✕</button>
            </div>
        </div>
    `;
    
    // Focus on the input
    setTimeout(() => {
        const input = categoryItem.querySelector('.category-edit-input');
        if (input) {
            input.focus();
            input.select();
        }
    }, 100);
}

// Cancel category edit
function cancelCategoryEdit(categoryKey) {
    refreshCategoriesList();
}

// Save category edit
function saveCategoryEdit(oldCategoryKey) {
    const categoryItem = document.querySelector(`.category-item[data-category="${oldCategoryKey}"]`);
    if (!categoryItem) return;
    
    const input = categoryItem.querySelector('.category-edit-input');
    if (!input) return;
    
    const newCategoryName = input.value.trim();
    
    if (!newCategoryName) {
        Utils.showNotification('Category name cannot be empty', 'warning');
        return;
    }
    
    // Convert to lowercase for consistency
    const newCategoryKey = newCategoryName.toLowerCase().replace(/\s+/g, '_');
    
    // Check if new name already exists (and it's not the same category)
    if (categories.includes(newCategoryKey) && newCategoryKey !== oldCategoryKey) {
        Utils.showNotification('Category name already exists', 'warning');
        return;
    }
    
    // Update the category in the array
    const index = categories.indexOf(oldCategoryKey);
    if (index !== -1) {
        categories[index] = newCategoryKey;
        saveCategories();
        
        // Refresh all category dropdowns
        refreshAllCategoryDropdowns();
        
        // Refresh the categories list
        refreshCategoriesList();
        
        Utils.showNotification(`Category renamed to "${newCategoryName}"`, 'success');
    }
}

// Save category changes
function saveCategory(oldCategoryKey) {
    const input = document.getElementById('editCategoryName');
    if (!input) return;
    
    const newCategoryName = input.value.trim();
    
    if (!newCategoryName) {
        Utils.showNotification('Category name cannot be empty', 'warning');
        return;
    }
    
    // Convert to lowercase for consistency
    const newCategoryKey = newCategoryName.toLowerCase().replace(/\s+/g, '_');
    
    // Check if new name already exists (and it's not the same category)
    if (categories.includes(newCategoryKey) && newCategoryKey !== oldCategoryKey) {
        Utils.showNotification('Category name already exists', 'warning');
        return;
    }
    
    // Update the category in the array
    const index = categories.indexOf(oldCategoryKey);
    if (index !== -1) {
        categories[index] = newCategoryKey;
        saveCategories();
        
        // Refresh all category dropdowns
        refreshAllCategoryDropdowns();
        
        // Refresh the categories list
        refreshCategoriesList();
        
        // Close the edit modal
        closeEditCategoryModal();
        
        Utils.showNotification(`Category renamed to "${newCategoryName}"`, 'success');
    }
}

// Close manage categories modal
function closeManageCategoriesModal() {
    const modal = document.getElementById('manageCategoriesModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Delete category with confirmation
function deleteCategory(categoryKey) {
    if (categories.length <= 1) {
        Utils.showNotification('Cannot delete the last category', 'warning');
        return;
    }
    
    const categoryName = getCategoryLabel(categoryKey);
    
    // Create confirmation modal
    const confirmModalHTML = `
        <div class="modal" id="deleteCategoryModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🗑️ Delete Category</h2>
                    <button onclick="closeDeleteCategoryModal()" class="close-btn">×</button>
                </div>
                <div class="modal-body">
                    <div class="delete-confirmation">
                        <div class="warning-message">
                            <div class="warning-icon">⚠️</div>
                            <h3>Are you sure?</h3>
                        </div>
                        <p>You are about to delete the category: <strong>"${categoryName}"</strong></p>
                        <p class="warning-text">Items currently using this category will be set to "Uncategorized".</p>
                        <p class="warning-text">This action cannot be undone.</p>
                    </div>
                    <div class="modal-actions">
                        <button onclick="closeDeleteCategoryModal()" class="cancel-btn">Cancel</button>
                        <button onclick="confirmDeleteCategory('${categoryKey}')" class="danger-btn">🗑️ Delete Category</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing delete modal if any
    const existingModal = document.getElementById('deleteCategoryModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', confirmModalHTML);
}

// Close delete category modal
function closeDeleteCategoryModal() {
    const modal = document.getElementById('deleteCategoryModal');
    if (modal) {
        modal.remove();
    }
}

// Confirm category deletion
function confirmDeleteCategory(categoryKey) {
    // Remove category from array
    categories = categories.filter(cat => cat !== categoryKey);
    saveCategories();
    
    // Refresh all dropdowns
    refreshAllCategoryDropdowns();
    
    // Refresh the categories list
    refreshCategoriesList();
    
    // Close the delete modal
    closeDeleteCategoryModal();
    
    Utils.showNotification('Category deleted successfully', 'success');
}