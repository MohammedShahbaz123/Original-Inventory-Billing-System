// Purchases management
let allPurchases = [];
let allSuppliers = [];

// Navigation function
function showPurchasePage() {
    console.log('📦 Navigating to purchase page');
    Navigation.showPage('purchases');
    loadPurchases();
}

async function loadPurchases() {
    try {
        const purchasesTable = document.getElementById('purchasesTable');
        if (purchasesTable) {
            purchasesTable.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-cell">
                        <div class="loading-spinner"></div>
                        Loading purchase records...
                    </td>
                </tr>
            `;
        }

        allPurchases = await SupabaseService.getPurchases();
        allSuppliers = await SupabaseService.getParties().then(parties => 
            parties.filter(party => party.type === 'supplier' || party.type === 'both')
        );
        
        displayPurchases(allPurchases);
        updatePurchasesTotal(allPurchases);
    } catch (error) {
        console.error('Error loading purchases:', error);
    }
}

function displayPurchases(purchases) {
    const purchasesTable = document.getElementById('purchasesTable');
    if (!purchasesTable) return;

    if (purchases.length === 0) {
        purchasesTable.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-state-content">
                        <div class="empty-icon">🛒</div>
                        <h3>No Purchase Records</h3>
                        <p>Get started by creating your first purchase invoice</p>
                        <button onclick="showPage('purchaseInvoice')" class="create-btn">+ Create Purchase</button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    purchasesTable.innerHTML = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Invoice #</th>
                <th>Supplier</th>
                <th>Items</th>
                <th>Total Amount</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${purchases.map(purchase => `
                <tr data-purchase-id="${purchase.id}">
                    <td>
                        <div class="date-cell">
                            <div class="date-primary">${Utils.formatDate(purchase.invoice_date)}</div>
                            <div class="date-secondary">${Utils.formatDateTime(purchase.created_at)}</div>
                        </div>
                    </td>
                    <td>
                        <div class="invoice-number">#${purchase.invoice_number || purchase.id.slice(-6)}</div>
                    </td>
                    <td>
                        <div class="party-cell">
                            <strong>${purchase.parties?.name || 'Unknown'}</strong>
                        </div>
                    </td>
                    <td>
                        <div class="items-cell">
                            ${purchase.purchase_items?.slice(0, 2).map(item => `
                                <div class="item-line">
                                    <span class="item-name">${item.items?.name || 'Unknown'}</span>
                                    <span class="item-qty">×${item.quantity}</span>
                                </div>
                            `).join('')}
                            ${purchase.purchase_items?.length > 2 ? `<div class="more-items">+${purchase.purchase_items.length - 2} more items</div>` : ''}
                        </div>
                    </td>
                    <td class="amount-cell">
                        <strong>${Utils.formatCurrency(calculatePurchaseTotal(purchase))}</strong>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button onclick="viewPurchase('${purchase.id}')" class="action-btn view-btn" title="View">
                                👁️
                            </button>
                            <button onclick="printPurchase('${purchase.id}')" class="action-btn print-btn" title="Print">
                                🖨️
                            </button>
                            <button onclick="deletePurchase('${purchase.id}')" class="action-btn delete-btn" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
}

function calculatePurchaseTotal(purchase) {
    if (!purchase.purchase_items) return 0;
    return purchase.purchase_items.reduce((total, item) => total + (item.quantity * item.price), 0);
}

function updatePurchasesTotal(purchases) {
    const totalElement = document.getElementById('purchasesGrandTotal');
    if (!totalElement) return;

    const totalAmount = purchases.reduce((sum, purchase) => sum + calculatePurchaseTotal(purchase), 0);
    const totalInvoices = purchases.length;

    totalElement.innerHTML = `
        <div class="total-display-content">
            <div class="total-amount">${Utils.formatCurrency(totalAmount)}</div>
            <div class="total-label">Total Purchases (${totalInvoices} invoices)</div>
        </div>
    `;
}

function filterPurchases() {
    const searchTerm = document.getElementById('purchasesSearch').value.toLowerCase();
    const filteredPurchases = allPurchases.filter(purchase => 
        (purchase.parties?.name || '').toLowerCase().includes(searchTerm) ||
        (purchase.invoice_number || '').toLowerCase().includes(searchTerm) ||
        purchase.purchase_items?.some(item => 
            item.items?.name.toLowerCase().includes(searchTerm)
        )
    );
    displayPurchases(filteredPurchases);
    updatePurchasesTotal(filteredPurchases);
}

function filterByDateRange() {
    const range = document.getElementById('dateRangeFilter').value;
    
    if (range === 'custom') {
        document.getElementById('customDateRange').style.display = 'flex';
        return;
    } else {
        document.getElementById('customDateRange').style.display = 'none';
    }

    const dateRange = DateRangeUtils.getDateRange(range);
    let filteredPurchases = allPurchases;

    if (dateRange.start && dateRange.end) {
        filteredPurchases = allPurchases.filter(purchase => {
            const purchaseDate = new Date(purchase.invoice_date);
            return purchaseDate >= new Date(dateRange.start) && purchaseDate <= new Date(dateRange.end);
        });
    }

    displayPurchases(filteredPurchases);
    updatePurchasesTotal(filteredPurchases);
}

function applyCustomDateRange() {
    const fromDate = document.getElementById('customDateFrom').value;
    const toDate = document.getElementById('customDateTo').value;

    if (!fromDate || !toDate) {
        Utils.showNotification('Please select both from and to dates', 'warning');
        return;
    }

    const filteredPurchases = allPurchases.filter(purchase => {
        const purchaseDate = new Date(purchase.invoice_date);
        return purchaseDate >= new Date(fromDate) && purchaseDate <= new Date(toDate + 'T23:59:59');
    });

    displayPurchases(filteredPurchases);
    updatePurchasesTotal(filteredPurchases);
}

function viewPurchase(purchaseId) {
    const purchase = allPurchases.find(p => p.id === purchaseId);
    if (purchase) {
        const total = calculatePurchaseTotal(purchase);
        Utils.showNotification(`Viewing purchase #${purchase.invoice_number || purchase.id.slice(-6)} - Total: ${Utils.formatCurrency(total)}`, 'info');
    }
}

function printPurchase(purchaseId) {
    const purchase = allPurchases.find(p => p.id === purchaseId);
    if (purchase) {
        const printWindow = window.open('', '_blank');
        const total = calculatePurchaseTotal(purchase);
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Purchase Invoice #${purchase.invoice_number || purchase.id.slice(-6)}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .details { margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f5f5f5; }
                        .total { font-weight: bold; font-size: 1.2em; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Purchase Invoice</h1>
                        <p>Invoice #: ${purchase.invoice_number || purchase.id.slice(-6)}</p>
                        <p>Date: ${Utils.formatDate(purchase.invoice_date)}</p>
                    </div>
                    <div class="details">
                        <p><strong>Supplier:</strong> ${purchase.parties?.name || 'Unknown'}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Quantity</th>
                                <th>Price</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${purchase.purchase_items?.map(item => `
                                <tr>
                                    <td>${item.items?.name || 'Unknown'}</td>
                                    <td>${item.quantity}</td>
                                    <td>${Utils.formatCurrency(item.price)}</td>
                                    <td>${Utils.formatCurrency(item.quantity * item.price)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" style="text-align: right;"><strong>Total:</strong></td>
                                <td class="total">${Utils.formatCurrency(total)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
    }
}

async function deletePurchase(purchaseId) {
    const purchase = allPurchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    if (confirm(`Are you sure you want to delete purchase invoice #${purchase.invoice_number || purchase.id.slice(-6)}? This action cannot be undone.`)) {
        try {
            await supabase.from('purchases').delete().eq('id', purchaseId);
            Utils.showNotification('Purchase invoice deleted successfully', 'success');
            await loadPurchases(); // Refresh the list
        } catch (error) {
            console.error('Error deleting purchase:', error);
            Utils.showNotification('Error deleting purchase invoice', 'error');
        }
    }
}