// =====================
// INVOICE MANAGEMENT
// =====================

// =====================
// SALES INVOICE FUNCTIONS
// =====================

// Add Sale Item to Invoice
function addSaleItemToInvoice() {
    // Validate item exists in datalist
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

    // Reset inputs and focus
    document.getElementById("saleItem").value = "";
    qtyEl.value = "";
    priceEl.value = "";
    document.getElementById("saleItem").focus();
}

// Render Sale Invoice Table
function renderSaleInvoiceTable() {
    const table = document.getElementById("saleInvoiceTable");
    if (!table) return;

    let html = `
        <thead>
            <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price (₹)</th>
                <th>Subtotal (₹)</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>`;

    tempSaleItems.forEach((row, i) => {
        html += `
            <tr>
                <td>${escapeHtml(row.item)}</td>
                <td style="text-align: center;">${row.qty}</td>
                <td style="text-align: right;">₹${row.price.toFixed(2)}</td>
                <td style="text-align: right; font-weight: bold;">₹${row.subtotal.toFixed(2)}</td>
                <td style="text-align: center;">
                    <button onclick="removeSaleItem(${i})" class="remove-item-btn" title="Remove Item">
                        ❌
                    </button>
                </td>
            </tr>`;
    });

    // Add grand total row
    const grandTotal = tempSaleItems.reduce((sum, item) => sum + item.subtotal, 0);
    html += `
        <tr style="font-weight: bold; background: #f8f9fa;">
            <td colspan="3" style="text-align: right; padding: 15px;">Grand Total:</td>
            <td style="text-align: right; padding: 15px; color: #e74c3c; font-size: 16px;">₹${grandTotal.toFixed(2)}</td>
            <td></td>
        </tr>`;

    html += "</tbody>";
    table.innerHTML = html;

    // Update any summary display
    updateSaleInvoiceSummary(grandTotal);
}

// Remove Sale Item
function removeSaleItem(index) {
    tempSaleItems.splice(index, 1);
    renderSaleInvoiceTable();
}

// Clear Sale Invoice
function clearSaleInvoice() {
    if (tempSaleItems.length > 0) {
        if (!confirm("Are you sure you want to clear all items from this invoice?")) {
            return;
        }
    }
    tempSaleItems = [];
    renderSaleInvoiceTable();
    document.getElementById("saleParty").value = "";
    document.getElementById("saleItem").focus();
}

// Update Sale Invoice Summary
function updateSaleInvoiceSummary(total) {
    const summaryDiv = document.getElementById("saleInvoiceSummary");
    if (summaryDiv) {
        summaryDiv.innerHTML = `
            <div class="invoice-summary">
                <div class="summary-item">
                    <span class="summary-label">Total Items:</span>
                    <span class="summary-value">${tempSaleItems.length}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Grand Total:</span>
                    <span class="summary-value" style="color: #e74c3c; font-weight: bold;">₹${total.toFixed(2)}</span>
                </div>
            </div>
        `;
    }
}

// Save Sale Invoice
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
        alert("Add at least one item to the invoice!");
        return;
    }

    const date = formatDate();
    
    try {
        showInvoiceMessage("Saving sale invoice...", "info");
        
        const result = await UniversalCORSHandler.callAPI('addSaleInvoice', {
            date: date,
            party: party,
            items: JSON.stringify(tempSaleItems)
        });

        if (result.success) {
            const invoiceId = result.id;
            const savedItems = [...tempSaleItems];
            
            // Clear temporary data
            tempSaleItems = [];
            renderSaleInvoiceTable();
            document.getElementById("saleParty").value = "";

            // Show success message
            showInvoiceMessage("Sale invoice saved successfully!", "success");
            
            // Show invoice page
            showInvoicePage(invoiceId, date, savedItems, "Sale", party);
            
        } else {
            throw new Error(result.error || 'Failed to save invoice');
        }
    } catch (err) {
        console.error("Failed to save sale invoice:", err);
        showInvoiceError("Failed to save invoice: " + err.message);
    }
}

// =====================
// PURCHASE INVOICE FUNCTIONS
// =====================

// Add Purchase Item to Invoice
function addPurchaseItemToInvoice() {
    // Validate item exists in datalist
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
    if (price <= 0) {
        alert("Please enter a valid price!");
        priceEl.focus();
        return;
    }

    const subtotal = qty * price;
    tempPurchaseItems.push({ item, qty, price, subtotal });
    renderPurchaseInvoiceTable();

    // Reset inputs and focus
    document.getElementById("purchaseItem").value = "";
    qtyEl.value = "";
    priceEl.value = "";
    document.getElementById("purchaseItem").focus();
}

// Render Purchase Invoice Table
function renderPurchaseInvoiceTable() {
    const table = document.getElementById("purchaseInvoiceTable");
    if (!table) return;

    let html = `
        <thead>
            <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price (₹)</th>
                <th>Subtotal (₹)</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>`;

    tempPurchaseItems.forEach((row, i) => {
        html += `
            <tr>
                <td>${escapeHtml(row.item)}</td>
                <td style="text-align: center;">${row.qty}</td>
                <td style="text-align: right;">₹${row.price.toFixed(2)}</td>
                <td style="text-align: right; font-weight: bold;">₹${row.subtotal.toFixed(2)}</td>
                <td style="text-align: center;">
                    <button onclick="removePurchaseItem(${i})" class="remove-item-btn" title="Remove Item">
                        ❌
                    </button>
                </td>
            </tr>`;
    });

    // Add grand total row
    const grandTotal = tempPurchaseItems.reduce((sum, item) => sum + item.subtotal, 0);
    html += `
        <tr style="font-weight: bold; background: #f8f9fa;">
            <td colspan="3" style="text-align: right; padding: 15px;">Grand Total:</td>
            <td style="text-align: right; padding: 15px; color: #27ae60; font-size: 16px;">₹${grandTotal.toFixed(2)}</td>
            <td></td>
        </tr>`;

    html += "</tbody>";
    table.innerHTML = html;

    // Update any summary display
    updatePurchaseInvoiceSummary(grandTotal);
}

// Remove Purchase Item
function removePurchaseItem(index) {
    tempPurchaseItems.splice(index, 1);
    renderPurchaseInvoiceTable();
}

// Clear Purchase Invoice
function clearPurchaseInvoice() {
    if (tempPurchaseItems.length > 0) {
        if (!confirm("Are you sure you want to clear all items from this invoice?")) {
            return;
        }
    }
    tempPurchaseItems = [];
    renderPurchaseInvoiceTable();
    document.getElementById("purchaseParty").value = "";
    document.getElementById("purchaseItem").focus();
}

// Update Purchase Invoice Summary
function updatePurchaseInvoiceSummary(total) {
    const summaryDiv = document.getElementById("purchaseInvoiceSummary");
    if (summaryDiv) {
        summaryDiv.innerHTML = `
            <div class="invoice-summary">
                <div class="summary-item">
                    <span class="summary-label">Total Items:</span>
                    <span class="summary-value">${tempPurchaseItems.length}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Grand Total:</span>
                    <span class="summary-value" style="color: #27ae60; font-weight: bold;">₹${total.toFixed(2)}</span>
                </div>
            </div>
        `;
    }
}

// Save Purchase Invoice
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
        alert("Add at least one item to the invoice!");
        return;
    }

    const date = formatDate();
    
    try {
        showInvoiceMessage("Saving purchase invoice...", "info");
        
        const result = await UniversalCORSHandler.callAPI('addPurchaseInvoice', {
            date: date,
            party: party,
            items: JSON.stringify(tempPurchaseItems)
        });

        if (result.success) {
            const invoiceId = result.id;
            const savedItems = [...tempPurchaseItems];
            
            // Clear temporary data
            tempPurchaseItems = [];
            renderPurchaseInvoiceTable();
            document.getElementById("purchaseParty").value = "";

            // Show success message
            showInvoiceMessage("Purchase invoice saved successfully!", "success");
            
            // Show invoice page
            showInvoicePage(invoiceId, date, savedItems, "Purchase", party);
            
        } else {
            throw new Error(result.error || 'Failed to save invoice');
        }
    } catch (err) {
        console.error("Failed to save purchase invoice:", err);
        showInvoiceError("Failed to save invoice: " + err.message);
    }
}

// =====================
// INVOICE DISPLAY FUNCTIONS
// =====================

// Show Invoice Page
function showInvoicePage(invoiceId, date, items, type, party = "") {
    console.log('showInvoicePage called for:', type, 'invoice', invoiceId);
    
    const container = document.getElementById("invoicePage");
    if (!container) return alert("Invoice container not found!");

    let grandTotal = 0;
    
    // Build invoice content
    let html = `
        <div class="invoice-display" style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin-bottom: 20px;">
            <div class="invoice-header" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #3498db;">
                <div>
                    <h3 style="margin: 0 0 15px 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 8px;">Invoice Details</h3>
                    <p style="margin: 8px 0;"><strong>Invoice ID:</strong> #${Security.escapeHtml(String(invoiceId))}</p>
                    <p style="margin: 8px 0;"><strong>Date:</strong> ${Security.escapeHtml(date)}</p>
                    <p style="margin: 8px 0;"><strong>Type:</strong> ${Security.escapeHtml(type)} Invoice</p>
                </div>
                <div>
                    <h3 style="margin: 0 0 15px 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 8px;">${type === 'Sale' ? 'Customer' : 'Supplier'} Details</h3>
                    <p style="margin: 8px 0;"><strong>${type === 'Sale' ? 'Customer' : 'Supplier'} Name:</strong> ${Security.escapeHtml(party || "N/A")}</p>
                    <p style="margin: 8px 0;"><strong>Invoice Total:</strong> <span style="color: ${type === 'Sale' ? '#e74c3c' : '#27ae60'}; font-weight: bold;" id="invoiceGrandTotal">Calculating...</span></p>
                </div>
            </div>
            
            <table width="100%" style="border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);">
                        <th style="padding: 15px; color: white; text-align: left; border: none; font-weight: 600;">Item Description</th>
                        <th style="padding: 15px; color: white; text-align: center; border: none; font-weight: 600;">Quantity</th>
                        <th style="padding: 15px; color: white; text-align: right; border: none; font-weight: 600;">Unit Price (₹)</th>
                        <th style="padding: 15px; color: white; text-align: right; border: none; font-weight: 600;">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>`;

    // Add items to table
    items.forEach(r => {
        const subtotal = Number(r.subtotal) || (Number(r.qty) * Number(r.price));
        html += `
            <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 12px; border-bottom: 1px solid #ecf0f1;">${escapeHtml(r.item)}</td>
                <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; text-align: center;">${r.qty}</td>
                <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; text-align: right;">₹${Number(r.price).toFixed(2)}</td>
                <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; text-align: right; font-weight: 500;">₹${subtotal.toFixed(2)}</td>
            </tr>`;
        grandTotal += subtotal;
    });

    // Add grand total row
    html += `
            <tr style="background: #f8f9fa; font-weight: bold;">
                <td colspan="3" style="padding: 20px; text-align: right; border: none; font-size: 16px; color: #2c3e50;">Grand Total:</td>
                <td style="padding: 20px; text-align: right; border: none; font-size: 18px; color: ${type === 'Sale' ? '#e74c3c' : '#27ae60'};">₹${grandTotal.toFixed(2)}</td>
            </tr>
        </tbody>
    </table>
    
    <div class="invoice-footer" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bdc3c7; text-align: center; color: #7f8c8d; font-size: 12px;">
        <p>Thank you for your business!</p>
    </div>
</div>`;

    // Update the page header title
    const headerTitle = container.querySelector('.header h1');
    if (headerTitle) {
        headerTitle.textContent = `${type} Invoice #${invoiceId}`;
    }

    // Update invoice content
    const invoiceContent = document.getElementById("invoiceContent");
    if (invoiceContent) {
        invoiceContent.innerHTML = html;
    }

    // Update the grand total in the header
    const grandTotalElement = document.getElementById("invoiceGrandTotal");
    if (grandTotalElement) {
        grandTotalElement.textContent = `₹${grandTotal.toFixed(2)}`;
    }

    // Show the invoice page
    Navigation.showPage("invoicePage");
}

// Print Invoice
function printInvoice() {
    const container = document.getElementById("invoiceContent");
    if (!container) return;

    // Create a printable version of the invoice
    const printableContent = container.cloneNode(true);
    
    // Create a style element for print
    const printStyle = `
        <style>
            @media print {
                body { 
                    margin: 0;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    color: #000;
                    background: white;
                }
                .no-print { 
                    display: none !important; 
                }
                .invoice-display { 
                    border: 2px solid #000 !important;
                    padding: 20px !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    background: white !important;
                }
                table { 
                    width: 100% !important; 
                    border-collapse: collapse !important; 
                    margin-top: 20px !important;
                }
                th { 
                    background: #f0f0f0 !important; 
                    color: #000 !important; 
                    padding: 12px !important; 
                    border: 1px solid #000 !important;
                    font-weight: bold !important;
                }
                td { 
                    padding: 10px !important; 
                    border: 1px solid #000 !important; 
                }
                h3 {
                    color: #000 !important;
                    margin: 10px 0 !important;
                }
                .header, .invoice-actions, button {
                    display: none !important;
                }
                .invoice-footer {
                    margin-top: 40px !important;
                }
            }
            @media screen {
                .print-only { 
                    display: none; 
                }
            }
        </style>
    `;

    // Create a temporary div for printing
    const printDiv = document.createElement('div');
    printDiv.innerHTML = printStyle + printableContent.innerHTML;
    
    // Add print header
    const headerTitle = document.querySelector('#invoicePage .header h1').textContent;
    const printHeader = `
        <div class="print-header" style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px;">
            <h1 style="margin: 0; font-size: 24px; color: #000;">${headerTitle}</h1>
            <p style="margin: 5px 0; font-size: 12px; color: #666;">Printed on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
    `;
    
    printDiv.innerHTML = printStyle + printHeader + printableContent.innerHTML;

    // Append to body temporarily
    document.body.appendChild(printDiv);

    // Print
    window.print();

    // Remove the temporary div after printing
    setTimeout(() => {
        if (printDiv.parentElement) {
            document.body.removeChild(printDiv);
        }
    }, 100);
}

// Download Invoice as PDF
async function downloadInvoicePDF() {
    const container = document.getElementById("invoicePage");
    if (!container) return;

    // Clone the element and remove action buttons
    const element = container.cloneNode(true);
    element.querySelectorAll("#invoiceActions, button, .no-print").forEach(btn => btn.remove());

    // Load html2pdf if not already loaded
    if (typeof html2pdf === "undefined") {
        await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }

    try {
        showInvoiceMessage("Generating PDF...", "info");
        
        const options = {
            margin: 0.5,
            filename: `invoice_${new Date().getTime()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: false
            },
            jsPDF: { 
                unit: 'in', 
                format: 'a4', 
                orientation: 'portrait' 
            }
        };

        await html2pdf().set(options).from(element).save();
        showInvoiceMessage("PDF downloaded successfully!", "success");
        
    } catch (err) {
        console.error("Failed to generate PDF:", err);
        showInvoiceError("Failed to generate PDF: " + err.message);
    }
}

// Share Invoice (Copy to Clipboard)
async function shareInvoice() {
    const container = document.getElementById("invoiceContent");
    if (!container) return;

    try {
        // Create a simplified text version
        const headerTitle = document.querySelector('#invoicePage .header h1').textContent;
        const invoiceText = `
${headerTitle}
${'='.repeat(50)}

${container.innerText}

Generated on: ${new Date().toLocaleString()}
        `.trim();

        await navigator.clipboard.writeText(invoiceText);
        showInvoiceMessage("Invoice copied to clipboard!", "success");
        
    } catch (err) {
        console.error("Failed to copy invoice:", err);
        showInvoiceError("Failed to copy invoice: " + err.message);
        
        // Fallback for browsers that don't support clipboard API
        alert("Please manually select and copy the invoice content.");
    }
}

// =====================
// INVOICE UTILITIES
// =====================

// Show Invoice Message
function showInvoiceMessage(message, type = "info") {
    // Remove existing message
    const existingMessage = document.querySelector('.invoice-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `invoice-message invoice-message-${type}`;
    messageDiv.innerHTML = `
        <span class="message-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="message-text">${message}</span>
        <button onclick="this.parentElement.remove()" class="message-close">×</button>
    `;

    const currentPage = document.querySelector('.page:not(.hidden)');
    if (currentPage) {
        const header = currentPage.querySelector('.header');
        if (header) {
            currentPage.insertBefore(messageDiv, header.nextSibling);
        } else {
            currentPage.insertBefore(messageDiv, currentPage.firstChild);
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

// Show Invoice Error
function showInvoiceError(message) {
    showInvoiceMessage(message, "error");
}

// Calculate Invoice Total
function calculateInvoiceTotal(items) {
    return items.reduce((total, item) => {
        return total + (Number(item.subtotal) || (Number(item.qty) * Number(item.price)));
    }, 0);
}

// Validate Item Input
function isValidItem(inputId, listId) {
    const inputEl = document.getElementById(inputId);
    if (!inputEl) return false;
    const input = inputEl.value.trim();
    const list = document.getElementById(listId);
    if (!list) return true; // no list to validate against

    const options = Array.from(list.options).map(opt => opt.value);

    if (!options.includes(input)) {
        alert("Please select a valid item from the list!");
        inputEl.focus();
        inputEl.select();
        return false;
    }
    return true;
}

// Quick Add Item (for faster invoice creation)
function quickAddItem(type, itemName, price) {
    if (type === 'sale') {
        document.getElementById("saleItem").value = itemName;
        document.getElementById("salePrice").value = price;
        document.getElementById("saleQty").focus();
    } else if (type === 'purchase') {
        document.getElementById("purchaseItem").value = itemName;
        document.getElementById("purchasePrice").value = price;
        document.getElementById("purchaseQty").focus();
    }
}

// =====================
// INVOICE STYLES
// =====================

function addInvoiceStyles() {
    if (document.querySelector('style[data-invoice-styles]')) return;
    
    const styles = `
        .invoice-summary {
            display: flex;
            gap: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #3498db;
        }
        
        .summary-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .summary-label {
            font-size: 12px;
            color: #6c757d;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .summary-value {
            font-size: 16px;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .remove-item-btn {
            background: none;
            border: none;
            padding: 5px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
        }
        
        .remove-item-btn:hover {
            background: #e74c3c;
            color: white;
            transform: scale(1.1);
        }
        
        .invoice-message {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 15px;
            margin-bottom: 20px;
            border-radius: 8px;
            font-weight: 500;
            animation: slideDown 0.3s ease;
        }
        
        .invoice-message-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .invoice-message-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .invoice-message-info {
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
        
        .invoice-actions {
            display: flex;
            gap: 10px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        
        .print-btn, .pdf-btn, .share-btn {
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
        
        .print-btn {
            background: #3498db;
            color: white;
        }
        
        .print-btn:hover {
            background: #2980b9;
            transform: translateY(-1px);
        }
        
        .pdf-btn {
            background: #e74c3c;
            color: white;
        }
        
        .pdf-btn:hover {
            background: #c0392b;
            transform: translateY(-1px);
        }
        
        .share-btn {
            background: #27ae60;
            color: white;
        }
        
        .share-btn:hover {
            background: #219a52;
            transform: translateY(-1px);
        }
        
        .quick-add-items {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 15px;
        }
        
        .quick-add-btn {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
        }
        
        .quick-add-btn:hover {
            background: #e9ecef;
            border-color: #3498db;
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
        
        @media (max-width: 768px) {
            .invoice-summary {
                flex-direction: column;
                gap: 10px;
            }
            
            .invoice-actions {
                flex-direction: column;
            }
            
            .quick-add-items {
                flex-direction: column;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.setAttribute('data-invoice-styles', 'true');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// =====================
// INITIALIZATION
// =====================

// Add to your existing DOMContentLoaded in main.js
document.addEventListener('DOMContentLoaded', function() {
    // Add invoice styles
    addInvoiceStyles();
    
    // Register invoice shortcuts
    shortcutManager.register(['Alt', 'S'], () => showPage("salesInvoice"), "Sales Invoice");
    shortcutManager.register(['Alt', 'P'], () => showPage("purchaseInvoice"), "Purchase Invoice");
    shortcutManager.register(['Alt', 'Enter'], () => {
        const salesVisible = !document.getElementById("salesInvoice").classList.contains("hidden");
        const purchaseVisible = !document.getElementById("purchaseInvoice").classList.contains("hidden");
        if (salesVisible) saveSaleInvoice();
        if (purchaseVisible) savePurchaseInvoice();
    }, "Save Invoice");
    
    // Add Enter key listeners for invoice forms
    const salePriceEl = document.getElementById("salePrice");
    if (salePriceEl) salePriceEl.addEventListener("keypress", e => { 
        if (e.key === "Enter") addSaleItemToInvoice(); 
    });
    
    const purchasePriceEl = document.getElementById("purchasePrice");
    if (purchasePriceEl) purchasePriceEl.addEventListener("keypress", e => { 
        if (e.key === "Enter") addPurchaseItemToInvoice(); 
    });
});