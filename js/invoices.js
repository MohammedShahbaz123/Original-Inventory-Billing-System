// Invoice management for both sales and purchases
let saleInvoiceItems = [];
let purchaseInvoiceItems = [];
let allItemsForInvoices = [];

// Sales Invoice Functions
async function initSalesInvoice() {
    // Set default date to today
    document.getElementById('saleDate').valueAsDate = new Date();
    
    // Load customers and items
    await loadCustomersForSales();
    await loadItemsForSales();
    
    // Reset invoice items
    saleInvoiceItems = [];
    updateSaleInvoiceTable();
    updateSaleGrandTotal();
}

async function loadCustomersForSales() {
    const salePartySelect = document.getElementById('saleParty');
    if (!salePartySelect) return;

    try {
        const customers = await SupabaseService.getParties().then(parties => 
            parties.filter(party => party.type === 'customer' || party.type === 'both')
        );

        salePartySelect.innerHTML = '<option value="">Select Customer</option>' +
            customers.map(customer => 
                `<option value="${customer.id}">${customer.name}</option>`
            ).join('');
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

async function loadItemsForSales() {
    try {
        allItemsForInvoices = await SupabaseService.getItems();
        const saleItemsList = document.getElementById('saleItemsList');
        
        saleItemsList.innerHTML = allItemsForInvoices.map(item => 
            `<option value="${item.name}" data-id="${item.id}" data-price="${item.price}" data-stock="${item.stock}">${item.name} (Stock: ${item.stock})</option>`
        ).join('');
    } catch (error) {
        console.error('Error loading items for sales:', error);
    }
}

function updateItemPrice() {
    const itemName = document.getElementById('saleItem').value;
    const item = allItemsForInvoices.find(i => i.name === itemName);
    const stockInfo = document.getElementById('itemStockInfo');
    
    if (item) {
        document.getElementById('salePrice').value = item.price;
        stockInfo.innerHTML = `Available stock: ${item.stock} units`;
        stockInfo.style.display = 'block';
        stockInfo.className = `stock-info ${item.stock > 10 ? 'in-stock' : item.stock > 0 ? 'low-stock' : 'out-of-stock'}`;
    } else {
        document.getElementById('salePrice').value = '';
        stockInfo.style.display = 'none';
    }
    
    calculateSaleSubtotal();
}

function calculateSaleSubtotal() {
    const quantity = parseInt(document.getElementById('saleQty').value) || 0;
    const price = parseFloat(document.getElementById('salePrice').value) || 0;
    const subtotal = quantity * price;
    
    document.getElementById('saleSubtotal').value = Utils.formatCurrency(subtotal);
}

function addSaleItemToInvoice() {
    const itemName = document.getElementById('saleItem').value;
    const quantity = parseInt(document.getElementById('saleQty').value);
    const price = parseFloat(document.getElementById('salePrice').value);
    
    // Validation
    if (!itemName) {
        Utils.showNotification('Please select an item', 'warning');
        return;
    }
    
    if (!quantity || quantity <= 0) {
        Utils.showNotification('Please enter a valid quantity', 'warning');
        return;
    }
    
    if (!price || price <= 0) {
        Utils.showNotification('Please enter a valid price', 'warning');
        return;
    }
    
    const item = allItemsForInvoices.find(i => i.name === itemName);
    if (!item) {
        Utils.showNotification('Selected item not found', 'error');
        return;
    }
    
    // Check stock availability
    if (item.stock < quantity) {
        Utils.showNotification(`Insufficient stock! Only ${item.stock} units available`, 'error');
        return;
    }
    
    const itemId = item.id;
    const subtotal = quantity * price;
    
    // FIX: Always add as new row, don't check for existing items
    // This allows adding the same item with different prices/quantities
    saleInvoiceItems.push({
        item_id: itemId,
        item_name: itemName,
        quantity: quantity,
        price: price,
        subtotal: subtotal
    });
    
    // Clear the form
    document.getElementById('saleItem').value = '';
    document.getElementById('saleQty').value = '';
    document.getElementById('salePrice').value = '';
    document.getElementById('saleSubtotal').value = '';
    document.getElementById('itemStockInfo').style.display = 'none';
    
    updateSaleInvoiceTable();
    updateSaleGrandTotal();
    
    Utils.showNotification('Item added to invoice', 'success');
}

function updateSaleInvoiceTable() {
    const tbody = document.getElementById('saleInvoiceItems');
    
    if (saleInvoiceItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-invoice">
                    <div class="empty-state-content">
                        <div class="empty-icon">📋</div>
                        <p>No items added to invoice</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = saleInvoiceItems.map((item, index) => `
        <tr data-item-index="${index}">
            <td>${item.item_name}</td>
            <td>${item.quantity}</td>
            <td>${Utils.formatCurrency(item.price)}</td>
            <td>${Utils.formatCurrency(item.subtotal)}</td>
            <td>
                <button onclick="removeSaleItem(${index})" class="action-btn delete-btn" title="Remove">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

function removeSaleItem(index) {
    saleInvoiceItems.splice(index, 1);
    updateSaleInvoiceTable();
    updateSaleGrandTotal();
}

function updateSaleGrandTotal() {
    const grandTotal = saleInvoiceItems.reduce((total, item) => total + item.subtotal, 0);
    document.getElementById('saleGrandTotal').textContent = Utils.formatCurrency(grandTotal);
}

function clearSaleInvoice() {
    if (saleInvoiceItems.length > 0 && !confirm('Are you sure you want to clear all items from the invoice?')) {
        return;
    }
    
    saleInvoiceItems = [];
    document.getElementById('saleDate').valueAsDate = new Date();
    document.getElementById('saleParty').value = '';
    document.getElementById('saleNotes').value = '';
    document.getElementById('saleItem').value = '';
    document.getElementById('saleQty').value = '';
    document.getElementById('salePrice').value = '';
    document.getElementById('saleSubtotal').value = '';
    document.getElementById('itemStockInfo').style.display = 'none';
    
    updateSaleInvoiceTable();
    updateSaleGrandTotal();
}

async function saveSaleInvoice() {
    try {
        console.log('💾 Starting saveSale...');
        
        // Collect form data with validation
        const partySelect = document.getElementById('saleParty');
        const dateInput = document.getElementById('saleDate');
        const invoiceNumberInput = document.getElementById('saleInvoiceNumber');
        
        if (!partySelect || !partySelect.value) {
            throw new Error('Please select a customer');
        }
        if (!dateInput || !dateInput.value) {
            throw new Error('Please select a date');
        }

        const saleData = {
    party_id: partySelect.value,
    invoice_date: dateInput.value, // This should be YYYY-MM-DD format
    invoice_number: invoiceNumberInput?.value || null,
    notes: document.getElementById('saleNotes')?.value || null
};

        console.log('📄 Sale data collected:', saleData);

        // FIX: Collect sale items from the saleInvoiceItems array
        const saleItems = saleInvoiceItems.map(item => ({
            item_id: item.item_id,
            quantity: item.quantity,
            price: item.price
        }));

        console.log(`🛒 Found ${saleItems.length} items from saleInvoiceItems array`, saleItems);

        if (saleItems.length === 0) {
            throw new Error('Please add at least one item to the sale');
        }

        console.log('🎯 Final data to send:', { saleData, saleItems });

        // Call the service
        const result = await SupabaseService.createSale(saleData, saleItems);
        console.log('✅ Sale saved successfully:', result);
        
        // Reset form and go back
        clearSaleInvoice(); // Use clearSaleInvoice instead of resetSaleForm
        Navigation.showPage('sales');
        
    } catch (error) {
        console.error('💥 Error in saveSale:', error);
        Utils.showNotification(error.message, 'error');
    }
}

// Purchase Invoice Functions
async function initPurchaseInvoice() {
    document.getElementById('purchaseDate').valueAsDate = new Date();
    await loadSuppliersForPurchases();
    await loadItemsForPurchases();
    
    purchaseInvoiceItems = [];
    updatePurchaseInvoiceTable();
    updatePurchaseGrandTotal();
}

async function loadSuppliersForPurchases() {
    const purchasePartySelect = document.getElementById('purchaseParty');
    if (!purchasePartySelect) return;

    try {
        const suppliers = await SupabaseService.getParties().then(parties => 
            parties.filter(party => party.type === 'supplier' || party.type === 'both')
        );

        purchasePartySelect.innerHTML = '<option value="">Select Supplier</option>' +
            suppliers.map(supplier => 
                `<option value="${supplier.id}">${supplier.name}</option>`
            ).join('');
    } catch (error) {
        console.error('Error loading suppliers:', error);
    }
}

async function loadItemsForPurchases() {
    try {
        allItemsForInvoices = await SupabaseService.getItems();
        const purchaseItemsList = document.getElementById('purchaseItemsList');
        
        purchaseItemsList.innerHTML = allItemsForInvoices.map(item => 
            `<option value="${item.name}" data-id="${item.id}" data-price="${item.price}">${item.name}</option>`
        ).join('');
    } catch (error) {
        console.error('Error loading items for purchases:', error);
    }
}

function updatePurchaseItemPrice() {
    const itemName = document.getElementById('purchaseItem').value;
    const item = allItemsForInvoices.find(i => i.name === itemName);
    
    if (item) {
        document.getElementById('purchasePrice').value = item.price;
    } else {
        document.getElementById('purchasePrice').value = '';
    }
    
    calculatePurchaseSubtotal();
}

function calculatePurchaseSubtotal() {
    const quantity = parseInt(document.getElementById('purchaseQty').value) || 0;
    const price = parseFloat(document.getElementById('purchasePrice').value) || 0;
    const subtotal = quantity * price;
    
    document.getElementById('purchaseSubtotal').value = Utils.formatCurrency(subtotal);
}

function addPurchaseItemToInvoice() {
    const itemName = document.getElementById('purchaseItem').value;
    const quantity = parseInt(document.getElementById('purchaseQty').value);
    const price = parseFloat(document.getElementById('purchasePrice').value);
    
    if (!itemName) {
        Utils.showNotification('Please select an item', 'warning');
        return;
    }
    
    if (!quantity || quantity <= 0) {
        Utils.showNotification('Please enter a valid quantity', 'warning');
        return;
    }
    
    if (!price || price <= 0) {
        Utils.showNotification('Please enter a valid price', 'warning');
        return;
    }
    
    const item = allItemsForInvoices.find(i => i.name === itemName);
    if (!item) {
        Utils.showNotification('Selected item not found', 'error');
        return;
    }
    
    const itemId = item.id;
    const subtotal = quantity * price;
    
    const existingItemIndex = purchaseInvoiceItems.findIndex(item => item.item_id === itemId);
    
    if (existingItemIndex > -1) {
        purchaseInvoiceItems[existingItemIndex].quantity += quantity;
        purchaseInvoiceItems[existingItemIndex].subtotal += subtotal;
    } else {
        purchaseInvoiceItems.push({
            item_id: itemId,
            item_name: itemName,
            quantity: quantity,
            price: price,
            subtotal: subtotal
        });
    }
    
    document.getElementById('purchaseItem').value = '';
    document.getElementById('purchaseQty').value = '';
    document.getElementById('purchasePrice').value = '';
    document.getElementById('purchaseSubtotal').value = '';
    
    updatePurchaseInvoiceTable();
    updatePurchaseGrandTotal();
}

function updatePurchaseInvoiceTable() {
    const tbody = document.getElementById('purchaseInvoiceItems');
    
    if (purchaseInvoiceItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-invoice">
                    <div class="empty-state-content">
                        <div class="empty-icon">📋</div>
                        <p>No items added to purchase</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = purchaseInvoiceItems.map((item, index) => `
        <tr>
            <td>${item.item_name}</td>
            <td>${item.quantity}</td>
            <td>${Utils.formatCurrency(item.price)}</td>
            <td>${Utils.formatCurrency(item.subtotal)}</td>
            <td>
                <button onclick="removePurchaseItem(${index})" class="action-btn delete-btn" title="Remove">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

function removePurchaseItem(index) {
    purchaseInvoiceItems.splice(index, 1);
    updatePurchaseInvoiceTable();
    updatePurchaseGrandTotal();
}

function updatePurchaseGrandTotal() {
    const grandTotal = purchaseInvoiceItems.reduce((total, item) => total + item.subtotal, 0);
    document.getElementById('purchaseGrandTotal').textContent = Utils.formatCurrency(grandTotal);
}

function clearPurchaseInvoice() {
    if (purchaseInvoiceItems.length > 0 && !confirm('Are you sure you want to clear all items from the purchase?')) {
        return;
    }
    
    purchaseInvoiceItems = [];
    document.getElementById('purchaseDate').valueAsDate = new Date();
    document.getElementById('purchaseParty').value = '';
    document.getElementById('purchaseItem').value = '';
    document.getElementById('purchaseQty').value = '';
    document.getElementById('purchasePrice').value = '';
    document.getElementById('purchaseSubtotal').value = '';
    
    updatePurchaseInvoiceTable();
    updatePurchaseGrandTotal();
}

async function savePurchaseInvoice() {
    const purchaseDate = document.getElementById('purchaseDate').value;
    const partyId = document.getElementById('purchaseParty').value;
    
    if (!purchaseDate) {
        Utils.showNotification('Please select invoice date', 'warning');
        return;
    }
    
    if (!partyId) {
        Utils.showNotification('Please select a supplier', 'warning');
        return;
    }
    
    if (purchaseInvoiceItems.length === 0) {
        Utils.showNotification('Please add at least one item to the purchase', 'warning');
        return;
    }
    
    const saveBtn = document.getElementById('savePurchaseBtn');
    Utils.showLoading(saveBtn);
    
    try {
        const purchaseData = {
            invoice_date: purchaseDate,
            party_id: partyId,
            created_at: new Date().toISOString()
        };
        
        const purchaseItemsData = purchaseInvoiceItems.map(item => ({
            item_id: item.item_id,
            quantity: item.quantity,
            price: item.price
        }));
        
        await SupabaseService.createPurchase(purchaseData, purchaseItemsData);
        
        clearPurchaseInvoice();
        Navigation.showPage('purchases');
        
    } catch (error) {
        console.error('Error saving purchase invoice:', error);
    } finally {
        Utils.hideLoading(saveBtn);
    }
}