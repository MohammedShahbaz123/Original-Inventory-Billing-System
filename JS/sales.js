// =====================
// Sales Module
// =====================

// =====================
// Sales Invoice Functions
// =====================

// Add Sale Item to Invoice
function addSaleItemToInvoice() {
  if (!isValidItem("saleItem", "saleItemsList")) return;

   const item = document.getElementById("saleItem").value.trim();
    const qty = Number(document.getElementById("saleQty").value);
    const price = Number(document.getElementById("salePrice").value);

  if (!item || qty <= 0) {
    UIUtils.showNotification("Please enter a valid quantity!", "error");
    document.getElementById("saleQty").focus();
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
  document.getElementById("saleQty").value = "";
  document.getElementById("salePrice").value = "";
  document.getElementById("saleItem").focus();
}

// Render Sale Invoice Table
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

// Remove Sale Item
function removeSaleItem(i) {
  tempSaleItems.splice(i, 1);
  renderSaleInvoiceTable();
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
    alert("Add at least one item!");
    return;
  }

   const date = DateUtils.formatDateForInput(new Date());
  
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

// =====================
// Sales History Functions
// =====================

// Load Sales
async function loadSales() {
  console.log("🔄 Loading sales page...");
  Navigation.showPage("sales");
  showSalesLoading();

  try {
    console.log("📊 Fetching sales data...");
    const result = await UniversalCORSHandler.callAPI('getSales');
    
    if (result.success) {
      const data = result.data || result;
      console.log("✅ Sales data loaded:", data.length, "records");
      window.allSalesData = processSalesData(data);
      renderSalesTable(window.allSalesData);
      // Force UI update
      setTimeout(() => {
        const salesPage = document.getElementById('sales');
        if (salesPage && !salesPage.classList.contains('hidden')) {
          console.log("✅ Sales page should be visible now");
        }
      }, 100);
    } else {
      throw new Error(result.error || 'Failed to load sales');
    }
    
  } catch (err) {
    console.error("Failed to load sales:", err);
    showSalesError("Failed to load sales: " + err.message);
}
}

// Process Sales Data
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

// Render Sales Table
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

// Show Sale Invoice Details
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

// Show Loading State for Sales
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

// Show Error for Sales
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

// Filter Sales
function filterSales() {
  const searchBox = document.getElementById('salesSearch');
  const filter = searchBox ? searchBox.value.trim() : "";
  renderSalesTable(window.allSalesData, filter);
}

// =====================
// Sales Date Range Filter Functions
// =====================

// Filter by date range for sales
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

// Apply date filter based on selected range for sales
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

// Apply custom date range for sales
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

// Initialize date inputs for sales
function initializeSalesDateInputs() {
  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);
  
  document.getElementById('salesCustomDateFrom').value = formatDateForInput(oneWeekAgo);
  document.getElementById('salesCustomDateTo').value = formatDateForInput(today);
}

// =====================
// Sales Shortcuts Registration
// =====================
function registerSalesShortcuts() {
    shortcutManager.register(['Alt', 'S'], () => showPage("salesInvoice"), "Create Sales Invoice");
    shortcutManager.register(['Alt', 'L'], () => loadSales(), "View Sales");
    
    // Sales invoice specific shortcuts
    shortcutManager.register(['Alt', 'Enter'], () => {
        if (!document.getElementById("salesInvoice").classList.contains("hidden")) {
            saveSaleInvoice();
        }
    }, "Save Sales Invoice");
}

// =====================
// Event Listeners for Sales
// =====================
function initializeSalesEvents() {
    // Enter key for sale price field
    const salePriceEl = document.getElementById("salePrice");
    if (salePriceEl) {
        salePriceEl.addEventListener("keypress", e => { 
            if (e.key === "Enter") addSaleItemToInvoice(); 
        });
    }
    
    // Register sales shortcuts
    registerSalesShortcuts();
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSalesEvents);
} else {
    initializeSalesEvents();
}
