// =====================
// Purchase Module
// =====================

// =====================
// Purchase Invoice Functions
// =====================

// Add Purchase Item to Invoice
function addPurchaseItemToInvoice() {
  if (!isValidItem("purchaseItem", "purchaseItemsList")) return;

  const item = document.getElementById("purchaseItem").value.trim();
  const qty = Number(document.getElementById("purchaseQty").value);
  const price = Number(document.getElementById("purchasePrice").value);

  if (!item || qty <= 0) {
     UIUtils.showNotification("Please enter a valid quantity!", "error");
    document.getElementById("purchaseQty").focus();
    return;
  }

  const subtotal = qty * price;
  tempPurchaseItems.push({ item, qty, price, subtotal });
  renderPurchaseInvoiceTable();

  document.getElementById("purchaseItem").value = "";
  document.getElementById("purchaseQty").value = "";
  document.getElementById("purchasePrice").value = "";
  document.getElementById("purchaseItem").focus();
}

// Render Purchase Invoice Table
function renderPurchaseInvoiceTable() {
  const table = document.getElementById("purchaseInvoiceTable");
  let html = `<thead>
      <tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th><th>Action</th></tr>
    </thead><tbody>`;

  tempPurchaseItems.forEach((row, i) => {
    html += `<tr>
      <td>${escapeHtml(row.item)}</td>
      <td>${row.qty}</td>
      <td>₹${row.price.toFixed(2)}</td>
      <td>₹${row.subtotal.toFixed(2)}</td>
      <td><button onclick="removePurchaseItem(${i})">Remove</button></td>
    </tr>`;
  });

  const grandTotal = tempPurchaseItems.reduce((sum, item) => sum + item.subtotal, 0);
  html += `<tr style="font-weight: bold; background: #f0f0f0;">
    <td colspan="3" style="text-align: right;">Grand Total:</td>
    <td>₹${grandTotal.toFixed(2)}</td>
    <td></td>
  </tr>`;

  html += "</tbody>";
  if (table) table.innerHTML = html;
}

// Remove Purchase Item
function removePurchaseItem(i) {
  tempPurchaseItems.splice(i, 1);
  renderPurchaseInvoiceTable();
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
    alert("Add at least one item!");
    return;
  }

  const date = DateUtils.formatDateForInput(new Date());
  
  try {
    const result = await UniversalCORSHandler.callAPI('addPurchaseInvoice', {
      date: date,
      party: party,
      items: JSON.stringify(tempPurchaseItems)
    });

    if (result.success) {
      const invoiceId = result.id;
      const savedItems = [...tempPurchaseItems];
      tempPurchaseItems = [];
      renderPurchaseInvoiceTable();

      showInvoicePage(invoiceId, date, savedItems, "Purchase", party);
      alert("Purchase invoice saved successfully!");
    } else {
      throw new Error(result.error || 'Failed to save invoice');
    }
  } catch (err) {
    console.error("Failed to save purchase invoice:", err);
    alert("Failed to save invoice: " + err.message);
  }
}

// =====================
// Purchase History Functions
// =====================

// Load Purchases
async function loadPurchases() {
  console.log("🔄 Loading purchases page...");
  
  // Show the page FIRST
  Navigation.showPage("purchases");
  showPurchasesLoading();

  try {
    console.log("📊 Fetching purchases data...");
    const result = await UniversalCORSHandler.callAPI('getPurchases');
    
    if (result.success) {
      const data = result.data || result;
      console.log("✅ Purchases data loaded:", data.length, "records");
      window.allPurchasesData = processPurchasesData(data);
      renderPurchasesTable(window.allPurchasesData);
      
      // Force UI update for purchases page
      setTimeout(() => {
        const purchasesPage = document.getElementById('purchases');
        if (purchasesPage && !purchasesPage.classList.contains('hidden')) {
          console.log("✅ Purchases page should be visible now");
        }
      }, 100);
      
    } else {
      throw new Error(result.error || 'Failed to load purchases');
    }
    
  } catch (err) {
    console.error("❌ Failed to load purchases:", err);
    showPurchasesError("Failed to load purchases: " + err.message);
  }
}

// Process Purchases Data
function processPurchasesData(data) {
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

// Render Purchases Table
function renderPurchasesTable(purchasesData, filter = "") {
  const table = document.getElementById("purchasesTable");
  const totalDiv = document.getElementById("purchasesGrandTotal");

  let grandTotal = 0;
  let html = `<thead>
    <tr>
      <th>Date</th>
      <th>Invoice ID</th>
      <th>Party Name</th>
      <th>Total Amount</th>
    </tr>
  </thead><tbody>`;

  if (!purchasesData || purchasesData.length === 0) {
    html += `<tr><td colspan="4" style="text-align: center; padding: 40px; color: #7f8c8d;">
      <div style="font-size: 18px; margin-bottom: 10px;">📭</div>
      No purchases found
    </td></tr>`;
  } else {
    const searchLower = filter.toLowerCase();
    let filteredCount = 0;

    purchasesData.forEach(purchase => {
      // Apply filter
      const matchesFilter = !filter || 
        purchase.party.toLowerCase().includes(searchLower) ||
        purchase.invoiceId.toString().includes(searchLower) ||
        purchase.date.toLowerCase().includes(searchLower);

      if (!matchesFilter) return;
      
      filteredCount++;
      grandTotal += purchase.total;

      html += `<tr class="purchase-row" data-invoice-id="${purchase.invoiceId}" 
                style="cursor: pointer; transition: background-color 0.2s;"
                onmouseover="this.style.backgroundColor='#f8f9fa'" 
                onmouseout="this.style.backgroundColor='white'"
                onclick="showPurchaseInvoice('${purchase.invoiceId}')">
        <td>${escapeHtml(purchase.date)}</td>
        <td style="text-align: center; font-weight: bold; color: #2c3e50;">${escapeHtml(purchase.invoiceId)}</td>
        <td>${escapeHtml(purchase.party || "N/A")}</td>
        <td style="text-align: right; font-weight: bold; color: #27ae60;">₹${purchase.total.toFixed(2)}</td>
      </tr>`;
    });

    if (filteredCount === 0 && filter) {
      html += `<tr><td colspan="4" style="text-align: center; padding: 40px; color: #e74c3c;">
        <div style="font-size: 18px; margin-bottom: 10px;">🔍</div>
        No purchases match your search
      </td></tr>`;
    }
  }

  html += "</tbody>";
  if (table) table.innerHTML = html;
  
  // Update total at the top
  if (totalDiv) {
    const filterText = filter ? ` (${purchasesData.filter(p => {
      const searchLower = filter.toLowerCase();
      return p.party.toLowerCase().includes(searchLower) ||
             p.invoiceId.toString().includes(searchLower) ||
             p.date.toLowerCase().includes(searchLower);
    }).length} records)` : ` (${purchasesData.length} records)`;
    
    totalDiv.innerHTML = `Total Purchase: ₹${grandTotal.toFixed(2)}${filterText}`;
  }

  // Add click event listeners to all rows
  setTimeout(() => {
    document.querySelectorAll('.purchase-row').forEach(row => {
      row.addEventListener('click', function() {
        const invoiceId = this.getAttribute('data-invoice-id');
        showPurchaseInvoice(invoiceId);
      });
    });
  }, 100);
}

// Show Purchase Invoice Details
function showPurchaseInvoice(invoiceId) {
  if (!window.allPurchasesData) {
    alert("Purchase data not loaded. Please refresh and try again.");
    return;
  }

  const purchase = window.allPurchasesData.find(p => p.invoiceId == invoiceId);
  if (!purchase) {
    alert("Purchase invoice not found!");
    return;
  }

  console.log('Showing purchase invoice, adding to history');
  
  // Show the invoice page with purchase details
  showInvoicePage(
    purchase.invoiceId,
    purchase.date,
    purchase.items,
    "Purchase",
    purchase.party
  );
}

// Show Loading State for Purchases
function showPurchasesLoading() {
  const table = document.getElementById("purchasesTable");
  if (table) {
    table.innerHTML = `
      <thead>
        <tr><th>Date</th><th>Invoice ID</th><th>Party Name</th><th>Total Amount</th></tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="4" style="text-align: center; padding: 40px;">
            <div style="display: inline-block; animation: spin 1s linear infinite;">🔄</div>
            <div style="margin-top: 10px;">Loading purchases...</div>
          </td>
        </tr>
      </tbody>`;
  }
  
  const totalDiv = document.getElementById("purchasesGrandTotal");
  if (totalDiv) {
    totalDiv.innerHTML = "Loading...";
  }
}

// Show Error for Purchases
function showPurchasesError(message) {
  const table = document.getElementById("purchasesTable");
  if (table) {
    table.innerHTML = `
      <thead>
        <tr><th>Date</th><th>Invoice ID</th><th>Party Name</th><th>Total Amount</th></tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="4" style="text-align: center; color: #e74c3c; padding: 30px; background: #fdf2f2;">
            <div style="font-size: 16px; margin-bottom: 10px;">⚠️ ${message}</div>
            <button onclick="loadPurchases()" style="padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Try Again
            </button>
          </td>
        </tr>
      </tbody>`;
  }
}

// Filter Purchases
function filterPurchases() {
  const searchBox = document.getElementById("purchasesSearch");
  const filter = searchBox ? searchBox.value.trim() : "";
  renderPurchasesTable(window.allPurchasesData, filter);
}

// =====================
// Purchase Date Range Filter Functions
// =====================

// Filter by date range for purchases
function filterByDateRange() {
  const dateRange = document.getElementById('dateRangeFilter').value;
  const customDateRange = document.getElementById('customDateRange');
  
  // Show/hide custom date range inputs
  if (dateRange === 'custom') {
    customDateRange.style.display = 'flex';
  } else {
    customDateRange.style.display = 'none';
    applyDateFilter(dateRange);
  }
}

// Apply date filter based on selected range
function applyDateFilter(range) {
  if (!window.allPurchasesData) return;
  
  const now = new Date();
  let filteredData = [...window.allPurchasesData];
  
  switch (range) {
    case 'today':
      filteredData = filteredData.filter(purchase => isSameDay(new Date(purchase.date), now));
      break;
      
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      filteredData = filteredData.filter(purchase => isSameDay(new Date(purchase.date), yesterday));
      break;
      
    case 'thisWeek':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      filteredData = filteredData.filter(purchase => new Date(purchase.date) >= startOfWeek);
      break;
      
    case 'lastWeek':
      const startOfLastWeek = new Date(now);
      startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      endOfLastWeek.setHours(23, 59, 59, 999);
      filteredData = filteredData.filter(purchase => {
        const purchaseDate = new Date(purchase.date);
        return purchaseDate >= startOfLastWeek && purchaseDate <= endOfLastWeek;
      });
      break;
      
    case 'thisMonth':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filteredData = filteredData.filter(purchase => new Date(purchase.date) >= startOfMonth);
      break;
      
    case 'lastMonth':
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      endOfLastMonth.setHours(23, 59, 59, 999);
      filteredData = filteredData.filter(purchase => {
        const purchaseDate = new Date(purchase.date);
        return purchaseDate >= startOfLastMonth && purchaseDate <= endOfLastMonth;
      });
      break;
      
    case 'thisYear':
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      filteredData = filteredData.filter(purchase => new Date(purchase.date) >= startOfYear);
      break;
      
    case 'lastYear':
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
      endOfLastYear.setHours(23, 59, 59, 999);
      filteredData = filteredData.filter(purchase => {
        const purchaseDate = new Date(purchase.date);
        return purchaseDate >= startOfLastYear && purchaseDate <= endOfLastYear;
      });
      break;
      
    case 'all':
    default:
      // Show all data
      break;
  }
  
  const searchText = document.getElementById('purchasesSearch').value;
  renderPurchasesTable(filteredData, searchText);
}

// Apply custom date range for purchases
function applyCustomDateRange() {
  const fromDate = document.getElementById('customDateFrom').value;
  const toDate = document.getElementById('customDateTo').value;
  
  if (!fromDate || !toDate) {
    alert('Please select both start and end dates');
    return;
  }
  
  if (!window.allPurchasesData) return;
  
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  endDate.setHours(23, 59, 59, 999);
  
  const filteredData = window.allPurchasesData.filter(purchase => {
    const purchaseDate = new Date(purchase.date);
    return purchaseDate >= startDate && purchaseDate <= endDate;
  });
  
  const searchText = document.getElementById('purchasesSearch').value;
  renderPurchasesTable(filteredData, searchText);
}

// Initialize date inputs for purchases
function initializeDateInputs() {
  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);
  
  document.getElementById('customDateFrom').value = formatDateForInput(oneWeekAgo);
  document.getElementById('customDateTo').value = formatDateForInput(today);
}

// =====================
// Purchase Shortcuts Registration
// =====================
function registerPurchaseShortcuts() {
    shortcutManager.register(['Alt', 'P'], () => showPage("purchaseInvoice"), "Create Purchase Invoice");
    shortcutManager.register(['Alt', 'U'], () => loadPurchases(), "View Purchases");
    
    // Purchase invoice specific shortcuts
    shortcutManager.register(['Alt', 'Enter'], () => {
        if (!document.getElementById("purchaseInvoice").classList.contains("hidden")) {
            savePurchaseInvoice();
        }
    }, "Save Purchase Invoice");
}

// =====================
// Event Listeners for Purchase
// =====================
function initializePurchaseEvents() {
    // Enter key for purchase price field
    const purchasePriceEl = document.getElementById("purchasePrice");
    if (purchasePriceEl) {
        purchasePriceEl.addEventListener("keypress", e => { 
            if (e.key === "Enter") addPurchaseItemToInvoice(); 
        });
    }
    
    // Register purchase shortcuts
    registerPurchaseShortcuts();
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePurchaseEvents);
} else {
    initializePurchaseEvents();
}