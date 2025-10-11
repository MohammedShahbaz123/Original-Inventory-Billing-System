// Sales management
let allSales = [];
let allCustomers = [];

// Navigation function
function showSalesPage() {
    console.log('📦 Navigating to Sales page');
    Navigation.showPage('sales');
    loadSales();
}

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
                <td colspan="4" class="empty-state">
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
                <th>Invoice Number</th>
                <th>Party Name</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${sales.map(sale => `
                <tr class="clickable-row" data-sale-id="${sale.id}" onclick="viewSaleInvoice('${sale.id}')">
                    <td>
                        <div class="date-cell">
                            ${Utils.formatDate(sale.invoice_date)}
                        </div>
                    </td>
                    <td>
                        <div class="invoice-number">#${sale.invoice_number}</div>
                    </td>
                    <td>
                        <div class="party-cell">
                            <strong>${sale.parties?.name || 'Unknown'}</strong>
                        </div>
                    </td>
                    <td class="amount-cell">
                        <strong>${Utils.formatCurrency(calculateSaleTotal(sale))}</strong>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
}

// View Invoice Functions
function viewSaleInvoice(saleId) {
    const sale = allSales.find(s => s.id === saleId);
    if (sale) {
        // Store the sale data for the invoice page
        sessionStorage.setItem('currentInvoice', JSON.stringify(sale));
        // Show invoice page
        Navigation.showPage('invoiceView');
        // Load the invoice data immediately
        setTimeout(() => loadInvoiceView(), 100);
    }
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
        const printContent = generateThermalInvoiceHTML(sale);
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        printWindow.onload = function() {
            printWindow.print();
            setTimeout(() => printWindow.close(), 500);
        };
    }
}

// Thermal printer optimized invoice
function generateThermalInvoiceHTML(sale) {
    const total = calculateSaleTotal(sale);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Invoice_${sale.invoice_number}</title>
    <style>
        ${getThermalPrintCSS()}
    </style>
</head>
<body>
    <div class="thermal-invoice">
        <div class="thermal-header">
            <h1>INVOICE</h1>
            <div class="company-mini">
                <strong>Your Company</strong><br>
                <small>Business Address</small>
            </div>
        </div>
        
        <div class="thermal-details">
            <div class="detail-row">
                <span><strong>Invoice #:</strong> ${sale.invoice_number}</span>
                <span><strong>Date:</strong> ${Utils.formatDate(sale.invoice_date)}</span>
            </div>
            <div class="detail-row">
                <strong>Customer:</strong> ${sale.parties?.name || 'Unknown'}
            </div>
        </div>
        
        <table class="thermal-items">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${sale.sale_items?.map(item => `
                    <tr>
                        <td>${truncateText(item.items?.name || 'Unknown', 20)}</td>
                        <td>${item.quantity}</td>
                        <td>${formatCurrencyForPrint(item.price)}</td>
                        <td>${formatCurrencyForPrint(item.quantity * item.price)}</td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot>
                <tr class="thermal-total">
                    <td colspan="3"><strong>TOTAL</strong></td>
                    <td><strong>${formatCurrencyForPrint(total)}</strong></td>
                </tr>
            </tfoot>
        </table>
        
        ${sale.notes ? `
        <div class="thermal-notes">
            <strong>Notes:</strong> ${sale.notes}
        </div>
        ` : ''}
        
        <div class="thermal-footer">
            <div class="thank-you">Thank you for your business!</div>
            <div class="print-info">Printed: ${new Date().toLocaleDateString()}</div>
        </div>
    </div>
</body>
</html>`;
}

// CSS optimized for thermal printers
function getThermalPrintCSS() {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            color: #000;
            background: white;
            padding: 5px;
            width: 80mm; /* Standard thermal paper width */
        }
        
        .thermal-invoice {
            width: 100%;
        }
        
        .thermal-header {
            text-align: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 2px solid #000;
        }
        
        .thermal-header h1 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        
        .company-mini {
            font-size: 10px;
        }
        
        .thermal-details {
            margin-bottom: 10px;
            padding: 5px 0;
        }
        
        .detail-row {
            margin-bottom: 3px;
            display: flex;
            justify-content: space-between;
        }
        
        .thermal-items {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
            font-size: 11px;
        }
        
        .thermal-items th {
            text-align: left;
            padding: 4px 2px;
            border-bottom: 1px solid #000;
            font-weight: bold;
        }
        
        .thermal-items td {
            padding: 3px 2px;
            border-bottom: 1px dashed #ccc;
        }
        
        .thermal-total {
            border-top: 2px solid #000;
            font-weight: bold;
        }
        
        .thermal-total td {
            padding: 5px 2px;
        }
        
        .thermal-notes {
            margin: 8px 0;
            padding: 5px;
            border: 1px dashed #000;
            font-size: 10px;
        }
        
        .thermal-footer {
            text-align: center;
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid #000;
            font-size: 10px;
        }
        
        .thank-you {
            font-weight: bold;
            margin-bottom: 3px;
        }
        
        .print-info {
            font-size: 9px;
            color: #666;
        }
        
        /* Remove all colors and shadows for thermal printing */
        * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            
            .thermal-invoice {
                width: 100% !important;
                max-width: 80mm !important;
            }
        }
    `;
}

// Format currency for print (remove .00 if not needed)
function formatCurrencyForPrint(amount) {
    if (amount % 1 === 0) {
        return '₹' + amount.toFixed(0); // No decimal places for whole numbers
    } else {
        return '₹' + amount.toFixed(2); // Keep 2 decimal places for non-whole numbers
    }
}

// Truncate long text for thermal printing
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 1) + '…';
}

// Enhanced invoice HTML generator
function generateInvoiceHTML(sale) {
    const total = calculateSaleTotal(sale);
    
    return `
        <div class="invoice-preview">
            <div class="invoice-header-preview">
                <div class="company-info">
                    <h1>INVOICE</h1>
                    <p>Your Company Name</p>
                    <p>Your Company Address</p>
                </div>
            </div>
            
            <div class="invoice-details-preview">
                <div class="bill-to">
                    <h3>Bill To:</h3>
                    <p><strong>${sale.parties?.name || 'Unknown'}</strong></p>
                </div>
                <div class="invoice-meta-preview">
                    <p><strong>Invoice #:</strong> ${sale.invoice_number}</p>
                    <p><strong>Date:</strong> ${Utils.formatDate(sale.invoice_date)}</p>
                </div>
            </div>
            
            <table class="invoice-items-preview">
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
                            <td>${formatCurrencyForPrint(item.price)}</td>
                            <td>${formatCurrencyForPrint(item.quantity * item.price)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr class="total-row-preview">
                        <td colspan="3" style="text-align: right;"><strong>Total:</strong></td>
                        <td><strong>${formatCurrencyForPrint(total)}</strong></td>
                    </tr>
                </tfoot>
            </table>
            
            ${sale.notes ? `
            <div class="invoice-notes-preview">
                <h3>Notes:</h3>
                <p>${sale.notes}</p>
            </div>
            ` : ''}
        </div>
    `;
}

async function deleteSale(saleId) {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) return;

    if (confirm(`Are you sure you want to delete sale invoice #${sale.invoice_number}? This action cannot be undone.`)) {
        try {
            const supabase = SupabaseService.getSupabase();
            await supabase.from('sales').delete().eq('id', saleId);
            Utils.showNotification('Sale invoice deleted successfully', 'success');
            await loadSales(); // Refresh the list
        } catch (error) {
            console.error('Error deleting sale:', error);
            Utils.showNotification('Error deleting sale invoice', 'error');
        }
    }
}

function loadInvoiceView() {
    const invoiceData = JSON.parse(sessionStorage.getItem('currentInvoice') || '{}');
    const container = document.getElementById('invoiceDetails');
    
    console.log('Loading invoice view:', invoiceData);
    
    if (container && invoiceData.id) {
        container.innerHTML = generateInvoiceHTML(invoiceData);
    } else {
        console.error('Invoice container not found or no invoice data');
        container.innerHTML = '<div class="error-state">Invoice not found</div>';
    }
}

function printCurrentInvoice() {
    const invoiceData = JSON.parse(sessionStorage.getItem('currentInvoice') || '{}');
    if (invoiceData.id) {
        printSale(invoiceData.id);
    }
}   

function deleteCurrentInvoice() {
    const invoiceData = JSON.parse(sessionStorage.getItem('currentInvoice') || '{}');
    if (invoiceData.id && confirm(`Are you sure you want to delete invoice #${invoiceData.invoice_number}? This action cannot be undone.`)) {
        deleteSale(invoiceData.id);
        // Go back to sales page after deletion
        setTimeout(() => showPage('sales'), 500);
    }
}

// Download invoice with options
function downloadInvoice(type = 'pdf') {
    const invoiceData = JSON.parse(sessionStorage.getItem('currentInvoice') || '{}');
    if (!invoiceData.id) return;

    switch(type) {
        case 'pdf':
            downloadAsPDF(invoiceData);
            break;
        case 'thermal':
            downloadAsThermal(invoiceData);
            break;
        case 'duplicate':
            downloadAsDuplicate(invoiceData);
            break;
        case 'triplicate':
            downloadAsTriplicate(invoiceData);
            break;
    }
}

// Download Functions
function downloadAsPDF(invoiceData) {
    const invoiceHTML = generateInvoiceHTML(invoiceData);
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice_${invoiceData.invoice_number}</title>
            <style>
                ${getPDFCSS()}
            </style>
        </head>
        <body>
            ${invoiceHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
    }, 500);
    
    Utils.showNotification('PDF download started', 'success');
}

function downloadAsDuplicate(invoiceData) {
    const duplicateHTML = generateDuplicateHTML(invoiceData, 2);
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(duplicateHTML);
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
    }, 500);
    
    Utils.showNotification('Duplicate download started', 'success');
}

function downloadAsTriplicate(invoiceData) {
    const triplicateHTML = generateTriplicateHTML(invoiceData, 3);
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(triplicateHTML);
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
    }, 500);
    
    Utils.showNotification('Triplicate download started', 'success');
}

// Print Functions
function printAsPDF(invoiceData) {
    const invoiceHTML = generateInvoiceHTML(invoiceData);
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice_${invoiceData.invoice_number}</title>
            <style>
                ${getPDFCSS()}
            </style>
        </head>
        <body>
            ${invoiceHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    
    printWindow.onload = function() {
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
    };
}

function printAsThermal(invoiceData) {
    const thermalHTML = generateThermalInvoiceHTML(invoiceData);
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(thermalHTML);
    printWindow.document.close();
    
    printWindow.onload = function() {
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
    };
}

function printAsDuplicate(invoiceData) {
    const duplicateHTML = generateDuplicateHTML(invoiceData, 2);
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(duplicateHTML);
    printWindow.document.close();
    
    printWindow.onload = function() {
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
    };
}

function printAsTriplicate(invoiceData) {
    const triplicateHTML = generateTriplicateHTML(invoiceData, 3);
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(triplicateHTML);
    printWindow.document.close();
    
    printWindow.onload = function() {
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
    };
}

// Generate Duplicate/Triplicate HTML
function generateDuplicateHTML(invoiceData, copies = 2) {
    let html = '';
    for (let i = 1; i <= copies; i++) {
        html += `
            <div class="copy-page">
                <div class="copy-header">
                    <h2>${i === 1 ? 'ORIGINAL' : 'DUPLICATE'}</h2>
                </div>
                ${generateThermalInvoiceHTML(invoiceData, i === 1 ? 'ORIGINAL' : 'DUPLICATE')}
                ${i < copies ? '<div style="page-break-after: always;"></div>' : ''}
            </div>
        `;
    }
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice_${invoiceData.invoice_number}_Duplicate</title>
            <style>
                ${getThermalPrintCSS()}
                .copy-page {
                    margin-bottom: 20px;
                }
                .copy-header {
                    text-align: center;
                    margin-bottom: 10px;
                    padding: 5px;
                    background: #f0f0f0;
                    border: 1px solid #000;
                }
                .copy-header h2 {
                    font-size: 14px;
                    margin: 0;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            ${html}
        </body>
        </html>`;
}

function generateTriplicateHTML(invoiceData, copies = 3) {
    let html = '';
    for (let i = 1; i <= copies; i++) {
        let copyType = '';
        if (i === 1) copyType = 'ORIGINAL';
        else if (i === 2) copyType = 'DUPLICATE';
        else copyType = 'TRIPLICATE';
        
        html += `
            <div class="copy-page">
                <div class="copy-header">
                    <h2>${copyType}</h2>
                </div>
                ${generateThermalInvoiceHTML(invoiceData, copyType)}
                ${i < copies ? '<div style="page-break-after: always;"></div>' : ''}
            </div>
        `;
    }
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice_${invoiceData.invoice_number}_Triplicate</title>
            <style>
                ${getThermalPrintCSS()}
                .copy-page {
                    margin-bottom: 20px;
                }
                .copy-header {
                    text-align: center;
                    margin-bottom: 10px;
                    padding: 5px;
                    background: #f0f0f0;
                    border: 1px solid #000;
                }
                .copy-header h2 {
                    font-size: 14px;
                    margin: 0;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            ${html}
        </body>
        </html>`;
}

// Update thermal invoice HTML to accept copy type
function generateThermalInvoiceHTML(sale, copyType = '') {
    const total = calculateSaleTotal(sale);
    
    return `
    <div class="thermal-invoice">
        ${copyType ? `<div class="copy-indicator">${copyType}</div>` : ''}
        <div class="thermal-header">
            <h1>INVOICE</h1>
            <div class="company-mini">
                <strong>Your Company</strong><br>
                <small>Business Address</small>
            </div>
        </div>
        
        <div class="thermal-details">
            <div class="detail-row">
                <span><strong>Invoice #:</strong> ${sale.invoice_number}</span>
                <span><strong>Date:</strong> ${Utils.formatDate(sale.invoice_date)}</span>
            </div>
            <div class="detail-row">
                <strong>Customer:</strong> ${sale.parties?.name || 'Unknown'}
            </div>
        </div>
        
        <table class="thermal-items">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${sale.sale_items?.map(item => `
                    <tr>
                        <td>${truncateText(item.items?.name || 'Unknown', 20)}</td>
                        <td>${item.quantity}</td>
                        <td>${formatCurrencyForPrint(item.price)}</td>
                        <td>${formatCurrencyForPrint(item.quantity * item.price)}</td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot>
                <tr class="thermal-total">
                    <td colspan="3"><strong>TOTAL</strong></td>
                    <td><strong>${formatCurrencyForPrint(total)}</strong></td>
                </tr>
            </tfoot>
        </table>
        
        ${sale.notes ? `
        <div class="thermal-notes">
            <strong>Notes:</strong> ${sale.notes}
        </div>
        ` : ''}
        
        <div class="thermal-footer">
            <div class="thank-you">Thank you for your business!</div>
            <div class="print-info">Printed: ${new Date().toLocaleDateString()}</div>
        </div>
    </div>`;
}

// CSS for PDF
function getPDFCSS() {
    return `
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
        }
        .invoice-preview {
            max-width: 800px;
            margin: 0 auto;
        }
        @media print {
            body { margin: 0; }
        }
    `;
}

// Print invoice with options
function printInvoice(type = 'pdf') {
    const invoiceData = JSON.parse(sessionStorage.getItem('currentInvoice') || '{}');
    if (!invoiceData.id) return;

    switch(type) {
        case 'pdf':
            printAsPDF(invoiceData);
            break;
        case 'thermal':
            printAsThermal(invoiceData);
            break;
        case 'duplicate':
            printAsDuplicate(invoiceData);
            break;
        case 'triplicate':
            printAsTriplicate(invoiceData);
            break;
    }
}

// Share invoice
function shareInvoice() {
    const invoiceData = JSON.parse(sessionStorage.getItem('currentInvoice') || '{}');
    if (invoiceData.id) {
        const invoiceText = generateInvoiceText(invoiceData);
        
        if (navigator.share) {
            // Web Share API (mobile devices)
            navigator.share({
                title: `Invoice #${invoiceData.invoice_number}`,
                text: invoiceText,
                // url: window.location.href // You can add URL if you have invoice links
            }).catch(error => {
                console.log('Error sharing:', error);
                fallbackShare(invoiceText);
            });
        } else {
            // Fallback for desktop
            fallbackShare(invoiceText);
        }
    }
}

function fallbackShare(invoiceText) {
    // Copy to clipboard
    navigator.clipboard.writeText(invoiceText).then(() => {
        Utils.showNotification('Invoice details copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback if clipboard fails
        const textArea = document.createElement('textarea');
        textArea.value = invoiceText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        Utils.showNotification('Invoice details copied to clipboard!', 'success');
    });
}

// Generate plain text version for sharing
function generateInvoiceText(sale) {
    const total = calculateSaleTotal(sale);
    const itemsText = sale.sale_items?.map(item => 
        `${item.items?.name || 'Unknown'} - ${item.quantity} x ${formatCurrencyForPrint(item.price)} = ${formatCurrencyForPrint(item.quantity * item.price)}`
    ).join('\n') || 'No items';
    
    return `INVOICE #${sale.invoice_number}
Date: ${Utils.formatDate(sale.invoice_date)}
Customer: ${sale.parties?.name || 'Unknown'}

ITEMS:
${itemsText}

Total: ${formatCurrencyForPrint(total)}
${sale.notes ? `Notes: ${sale.notes}` : ''}
---
Generated by Business Management System`;
}