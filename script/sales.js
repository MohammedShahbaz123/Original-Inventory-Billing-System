// Sales management
let allSales = [];
let allCustomers = [];

async function loadSales() {
    try {
        const salesTable = document.getElementById('salesTable');
        if (salesTable) {
            salesTable.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-cell">
                        <div class="loading-spinner"></div>
                        Loading sales records...
                    </td>
                </tr>
            `;
        }

        allSales = await SupabaseService.getSales();
        allCustomers = await SupabaseService.getParties().then(parties => 
            parties.filter(party => party.type === 'customer' || party.type === 'both')
        );
        
        displaySales(allSales);
        updateSalesTotal(allSales);
    } catch (error) {
        console.error('Error loading sales:', error);
    }
}

function displaySales(sales) {
    const salesTable = document.getElementById('salesTable');
    if (!salesTable) return;

    if (sales.length === 0) {
        salesTable.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-state-content">
                        <div class="empty-icon">💰</div>
                        <h3>No Sales Records</h3>
                        <p>Get started by creating your first sale invoice</p>
                        <button onclick="showPage('salesInvoice')" class="create-btn">+ Create Sale</button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    salesTable.innerHTML = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total Amount</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${sales.map(sale => `
                <tr data-sale-id="${sale.id}">
                    <td>
                        <div class="date-cell">
                            <div class="date-primary">${Utils.formatDate(sale.invoice_date)}</div>
                            <div class="date-secondary">${Utils.formatDateTime(sale.created_at)}</div>
                        </div>
                    </td>
                    <td>
                        <div class="invoice-number">#${sale.invoice_number || sale.id.slice(-6)}</div>
                    </td>
                    <td>
                        <div class="party-cell">
                            <strong>${sale.parties?.name || 'Unknown'}</strong>
                        </div>
                    </td>
                    <td>
                        <div class="items-cell">
                            ${sale.sale_items?.slice(0, 2).map(item => `
                                <div class="item-line">
                                    <span class="item-name">${item.items?.name || 'Unknown'}</span>
                                    <span class="item-qty">×${item.quantity}</span>
                                </div>
                            `).join('')}
                            ${sale.sale_items?.length > 2 ? `<div class="more-items">+${sale.sale_items.length - 2} more items</div>` : ''}
                        </div>
                    </td>
                    <td class="amount-cell">
                        <strong>${Utils.formatCurrency(calculateSaleTotal(sale))}</strong>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button onclick="viewSale('${sale.id}')" class="action-btn view-btn" title="View">
                                👁️
                            </button>
                            <button onclick="printSale('${sale.id}')" class="action-btn print-btn" title="Print">
                                🖨️
                            </button>
                            <button onclick="deleteSale('${sale.id}')" class="action-btn delete-btn" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
}

function calculateSaleTotal(sale) {
    if (!sale.sale_items) return 0;
    return sale.sale_items.reduce((total, item) => total + (item.quantity * item.price), 0);
}

function updateSalesTotal(sales) {
    const totalElement = document.getElementById('salesGrandTotal');
    if (!totalElement) return;

    const totalAmount = sales.reduce((sum, sale) => sum + calculateSaleTotal(sale), 0);
    const totalInvoices = sales.length;

    totalElement.innerHTML = `
        <div class="total-display-content">
            <div class="total-amount">${Utils.formatCurrency(totalAmount)}</div>
            <div class="total-label">Total Sales (${totalInvoices} invoices)</div>
        </div>
    `;
}

function filterSales() {
    const searchTerm = document.getElementById('salesSearch').value.toLowerCase();
    const filteredSales = allSales.filter(sale => 
        (sale.parties?.name || '').toLowerCase().includes(searchTerm) ||
        (sale.invoice_number || '').toLowerCase().includes(searchTerm) ||
        sale.sale_items?.some(item => 
            item.items?.name.toLowerCase().includes(searchTerm)
        )
    );
    displaySales(filteredSales);
    updateSalesTotal(filteredSales);
}

function filterSalesByDateRange() {
    const range = document.getElementById('salesDateRangeFilter').value;
    
    if (range === 'custom') {
        document.getElementById('salesCustomDateRange').style.display = 'flex';
        return;
    } else {
        document.getElementById('salesCustomDateRange').style.display = 'none';
    }

    const dateRange = DateRangeUtils.getDateRange(range);
    let filteredSales = allSales;

    if (dateRange.start && dateRange.end) {
        filteredSales = allSales.filter(sale => {
            const saleDate = new Date(sale.invoice_date);
            return saleDate >= new Date(dateRange.start) && saleDate <= new Date(dateRange.end);
        });
    }

    displaySales(filteredSales);
    updateSalesTotal(filteredSales);
}

function applySalesCustomDateRange() {
    const fromDate = document.getElementById('salesCustomDateFrom').value;
    const toDate = document.getElementById('salesCustomDateTo').value;

    if (!fromDate || !toDate) {
        Utils.showNotification('Please select both from and to dates', 'warning');
        return;
    }

    const filteredSales = allSales.filter(sale => {
        const saleDate = new Date(sale.invoice_date);
        return saleDate >= new Date(fromDate) && saleDate <= new Date(toDate + 'T23:59:59');
    });

    displaySales(filteredSales);
    updateSalesTotal(filteredSales);
}

function viewSale(saleId) {
    const sale = allSales.find(s => s.id === saleId);
    if (sale) {
        // For now, show basic info
        const total = calculateSaleTotal(sale);
        Utils.showNotification(`Viewing sale #${sale.invoice_number || sale.id.slice(-6)} - Total: ${Utils.formatCurrency(total)}`, 'info');
    }
}

function printSale(saleId) {
    const sale = allSales.find(s => s.id === saleId);
    if (sale) {
        // Simple print functionality
        const printWindow = window.open('', '_blank');
        const total = calculateSaleTotal(sale);
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Sale Invoice #${sale.invoice_number || sale.id.slice(-6)}</title>
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
                        <h1>Sale Invoice</h1>
                        <p>Invoice #: ${sale.invoice_number || sale.id.slice(-6)}</p>
                        <p>Date: ${Utils.formatDate(sale.invoice_date)}</p>
                    </div>
                    <div class="details">
                        <p><strong>Customer:</strong> ${sale.parties?.name || 'Unknown'}</p>
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
                            ${sale.sale_items?.map(item => `
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
                    ${sale.notes ? `<div class="notes"><strong>Notes:</strong> ${sale.notes}</div>` : ''}
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
    }
}

async function deleteSale(saleId) {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) return;

    if (confirm(`Are you sure you want to delete sale invoice #${sale.invoice_number || sale.id.slice(-6)}? This action cannot be undone.`)) {
        try {
            // In a real app, you'd properly handle the deletion with transaction rollback
            await supabase.from('sales').delete().eq('id', saleId);
            Utils.showNotification('Sale invoice deleted successfully', 'success');
            await loadSales(); // Refresh the list
        } catch (error) {
            console.error('Error deleting sale:', error);
            Utils.showNotification('Error deleting sale invoice', 'error');
        }
    }
}