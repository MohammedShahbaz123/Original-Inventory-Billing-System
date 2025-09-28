// =====================
// Google Apps Script URL
// =====================
const API_URL = "https://script.google.com/macros/s/AKfycbxKgamdMhZflXqTfD95ri3QqrvpjORguOhTMLd4P7qdz86T5QW2wtPo2wV833pAnc3bcw/exec";

// =====================
// Page Switching
// =====================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const page = document.getElementById(id);
  if (!page) return;
  page.classList.remove('hidden');

  // focus first field
  const firstInput = page.querySelector('input, select, button');
  if (firstInput) firstInput.focus();

  // load dropdown items & parties for invoices
  if (id === "salesInvoice" || id === "purchaseInvoice") {
    loadItemsDropdown();
    loadParties(); // ensure party dropdowns are up-to-date
  }
}

// =====================
// Create Item
// =====================
async function addItem() {
  const name = document.getElementById("itemName").value.trim();
  const price = Number(document.getElementById("itemPrice").value);
  const stock = Number(document.getElementById("itemStock").value);

  if (!name || price <= 0 || stock < 0) {
    alert("Enter valid item details!");
    return;
  }

  const url = `${API_URL}?action=addItem&name=${encodeURIComponent(name)}&price=${price}&stock=${stock}`;
  await fetch(url);

  alert("Item added!");
  document.getElementById("itemName").value = "";
  document.getElementById("itemPrice").value = "";
  document.getElementById("itemStock").value = "";
  loadItemsDropdown();
}

// =====================
// Party Management - FIXED VERSION
// =====================

// Load parties from Google Sheet
async function loadParties() {
  try {
    const res = await fetch(`${API_URL}?action=getParties`);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    // First, get the response as text to see what we're dealing with
    const responseText = await res.text();
    console.log("Raw parties response:", responseText);
    
    let parties = [];
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText);
      
      // Handle different response formats from your GAS
      if (Array.isArray(data)) {
        // Direct array response (your original format)
        parties = data;
      } else if (data && Array.isArray(data.parties)) {
        // Object with parties array (new format)
        parties = data.parties;
      } else if (data && data.success === false) {
        console.error("Server error:", data.error);
        throw new Error(data.error || "Failed to load parties");
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.log("Raw response that failed to parse:", responseText);
      throw new Error("Invalid JSON response from server");
    }
    
    // Update UI with parties
    updatePartyUI(parties);
    
  } catch (err) {
    console.error("Failed to load parties:", err);
    alert("Failed to load parties. Check console for details.");
    // Set empty arrays to avoid breaking the UI
    updatePartyUI([]);
  }
}

// Helper function to update all party-related UI elements
function updatePartyUI(parties) {
  const list = document.getElementById("partyList");
  const saleParty = document.getElementById("saleParty");
  const purchaseParty = document.getElementById("purchaseParty");

  // Update party list
  if (list) {
    list.innerHTML = parties.length > 0 
      ? parties.map(p => `<li>${escapeHtml(p)}</li>`).join("")
      : "<li>No parties found</li>";
  }

  // Update sale party dropdown
  if (saleParty) {
    saleParty.innerHTML = `<option value="">-- Select Party --</option>`;
    parties.forEach(p => {
      let opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      saleParty.appendChild(opt);
    });
  }

  // Update purchase party dropdown
  if (purchaseParty) {
    purchaseParty.innerHTML = `<option value="">-- Select Party --</option>`;
    parties.forEach(p => {
      let opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      purchaseParty.appendChild(opt);
    });
  }
  
  console.log("Updated UI with parties:", parties);
}

// Add a new party - FIXED VERSION
async function addParty() {
  const name = document.getElementById("partyName").value.trim();
  if (!name) return alert("Party name cannot be empty!");

  try {
    const url = `${API_URL}?action=addParty&name=${encodeURIComponent(name)}`;
    console.log("Adding party URL:", url);
    
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    // Get response as text first
    const responseText = await res.text();
    console.log("Add party raw response:", responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse addParty response:", parseError);
      // If it's not JSON but the request succeeded, assume it worked
      if (res.ok) {
        data = { success: true };
      } else {
        throw new Error("Invalid response from server");
      }
    }

    if (data.success) {
      alert("Party added successfully!");
      document.getElementById("partyName").value = "";
      loadParties(); // refresh dropdowns
    } else {
      alert(data.error || "Failed to add party.");
    }
  } catch (err) {
    console.error("Failed to add party:", err);
    alert("Failed to add party. Check console for details.");
  }
}

// =====================
// Load Items into Dropdowns
// =====================
async function loadItemsDropdown() {
  const res = await fetch(`${API_URL}?action=getInventory`);
  const data = await res.json();
  const items = (Array.isArray(data) && data.length > 1) ? data.slice(1).map(row => row[1]) : []; // item name column

  const saleList = document.getElementById("saleItemsList");
  const purchaseList = document.getElementById("purchaseItemsList");

  if (saleList) saleList.innerHTML = "";
  if (purchaseList) purchaseList.innerHTML = "";

  items.forEach(item => {
    if (saleList) saleList.appendChild(new Option(item, item));
    if (purchaseList) purchaseList.appendChild(new Option(item, item));
  });

  // clear selected value (if present)
  const saleItemEl = document.getElementById("saleItem");
  const purchaseItemEl = document.getElementById("purchaseItem");
  if (saleItemEl) saleItemEl.value = "";
  if (purchaseItemEl) purchaseItemEl.value = "";
}

// =====================
// Validate Item Input with focus
// =====================
function isValidItem(inputId, listId) {
  const inputEl = document.getElementById(inputId);
  if (!inputEl) return false;
  const input = inputEl.value.trim();
  const list = document.getElementById(listId);
  if (!list) return true; // no list to validate against

  const options = Array.from(list.options).map(opt => opt.value);

  if (!options.includes(input)) {
    alert("Please select a valid item from the list!");
    inputEl.focus();   // focus back to the input
    inputEl.select();  // highlight text for quick correction
    return false;
  }
  return true;
}

// =====================
// TEMP ARRAYS
// =====================
let tempSaleItems = [];
let tempPurchaseItems = [];

// =====================
// Add Sale Item - UPDATED to show calculation
// =====================
function addSaleItemToInvoice() {
  // validate item exists in datalist
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

  // reset inputs and focus
  document.getElementById("saleItem").value = "";
  qtyEl.value = "";
  priceEl.value = "";
  document.getElementById("saleItem").focus();
}

// Render sale invoice table - UPDATED to show calculation
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

  // Add grand total row
  const grandTotal = tempSaleItems.reduce((sum, item) => sum + item.subtotal, 0);
  html += `<tr style="font-weight: bold; background: #f0f0f0;">
    <td colspan="3" style="text-align: right;">Grand Total:</td>
    <td>₹${grandTotal.toFixed(2)}</td>
    <td></td>
  </tr>`;

  html += "</tbody>";
  if (table) table.innerHTML = html;
}

function removeSaleItem(i) {
  tempSaleItems.splice(i, 1);
  renderSaleInvoiceTable();
}

// Save sale invoice - UPDATED for subtotal
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

  const date = formatDate();
  
  // Build URL with individual parameters
  const url = `${API_URL}?action=addSaleInvoice` +
    `&date=${encodeURIComponent(date)}` +
    `&party=${encodeURIComponent(party)}` +
    `&items=${encodeURIComponent(JSON.stringify(tempSaleItems))}`;

  console.log("Saving sale invoice URL:", url);

  try {
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const invoiceId = await res.text();
    const savedItems = [...tempSaleItems];
    tempSaleItems = [];
    renderSaleInvoiceTable();

    // show invoice page with party included
    showInvoicePage(invoiceId, date, savedItems, "Sale", party);
    
    alert("Sale invoice saved successfully!");
  } catch (err) {
    console.error("Failed to save sale invoice:", err);
    alert("Failed to save invoice: " + err.message);
  }
}

// =====================
// Add Purchase Item - UPDATED to show calculation
// =====================
function addPurchaseItemToInvoice() {
  // validate item exists in datalist
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

  // reset inputs and focus
  document.getElementById("purchaseItem").value = "";
  qtyEl.value = "";
  priceEl.value = "";
  document.getElementById("purchaseItem").focus();
}

// Render purchase invoice table - UPDATED to show calculation
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

  // Add grand total row
  const grandTotal = tempPurchaseItems.reduce((sum, item) => sum + item.subtotal, 0);
  html += `<tr style="font-weight: bold; background: #f0f0f0;">
    <td colspan="3" style="text-align: right;">Grand Total:</td>
    <td>₹${grandTotal.toFixed(2)}</td>
    <td></td>
  </tr>`;

  html += "</tbody>";
  if (table) table.innerHTML = html;
}

function removePurchaseItem(i) {
  tempPurchaseItems.splice(i, 1);
  renderPurchaseInvoiceTable();
}

// Save purchase invoice - UPDATED for subtotal
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

  const date = formatDate();
  
  // Build URL with individual parameters
  const url = `${API_URL}?action=addPurchaseInvoice` +
    `&date=${encodeURIComponent(date)}` +
    `&party=${encodeURIComponent(party)}` +
    `&items=${encodeURIComponent(JSON.stringify(tempPurchaseItems))}`;

  console.log("Saving purchase invoice URL:", url);

  try {
    const res = await fetch(url);
    const invoiceId = await res.text();

    const savedItems = [...tempPurchaseItems];
    tempPurchaseItems = [];
    renderPurchaseInvoiceTable();

    // show invoice page with party included
    showInvoicePage(invoiceId, date, savedItems, "Purchase", party);
    
    alert("Purchase invoice saved successfully!");
  } catch (err) {
    console.error("Failed to save purchase invoice:", err);
    alert("Failed to save invoice: " + err.message);
  }
}

// =====================
// Show Invoice Page - UPDATED to show calculation
// =====================
function showInvoicePage(invoiceId, date, items, type, party = "") {
  const container = document.getElementById("invoicePage");
  if (!container) return alert("Invoice container not found!");

  let grandTotal = 0;
  let html = `<div style="position: relative;">
      <h2 style="margin:0;">${escapeHtml(type)} Invoice</h2>
      <div id="invoiceActions" style="position:absolute; top:0; right:0;">
        <button id="printBtn" onclick="printInvoice()" style="margin-right:5px;">Print</button>
        <button id="downloadBtn" onclick="downloadInvoicePDF()">Download</button>
      </div>
    </div>
    <p><b>Invoice ID:</b> ${escapeHtml(String(invoiceId))}</p>
    <p><b>Date:</b> ${escapeHtml(date)}</p>
    <p><b>Party:</b> ${escapeHtml(party)}</p>
    <table border="1" width="100%" style="border-collapse: collapse;">
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>`;

  items.forEach(r => {
    const subtotal = Number(r.subtotal) || (Number(r.qty) * Number(r.price));
    html += `<tr>
      <td>${escapeHtml(r.item)}</td>
      <td>${r.qty}</td>
      <td>₹${Number(r.price).toFixed(2)}</td>
      <td>₹${subtotal.toFixed(2)}</td>
    </tr>`;
    grandTotal += subtotal;
  });

  html += `<tr style="font-weight:bold;background:#f0f0f0;">
      <td colspan="3" style="text-align:right">Grand Total:</td>
      <td>₹${grandTotal.toFixed(2)}</td>
    </tr></tbody></table>`;

  container.innerHTML = html;
  showPage("invoicePage");
}

// =====================
// Print & Download
// =====================
function printInvoice() {
  const container = document.getElementById("invoicePage");
  if (!container) return;

  // clone and remove action buttons
  const invoiceContent = container.cloneNode(true);
  invoiceContent.querySelectorAll("#invoiceActions, button").forEach(btn => btn.remove());

  const newWin = window.open("", "_blank");
  newWin.document.write(`
    <html><head><title>Invoice</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width:100%; border-collapse: collapse; margin-top:10px; }
        th, td { border:1px solid #000; padding:8px; text-align:left; }
        th { background:#f0f0f0; }
      </style>
    </head><body>${invoiceContent.innerHTML}</body></html>
  `);
  newWin.document.close();
  newWin.print();
}

async function downloadInvoicePDF() {
  const container = document.getElementById("invoicePage");
  if (!container) return;

  // clone and remove action buttons
  const element = container.cloneNode(true);
  element.querySelectorAll("#invoiceActions, button").forEach(btn => btn.remove());

  if (typeof html2pdf === "undefined") {
    await new Promise(resolve => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = resolve;
      document.body.appendChild(script);
    });
  }

  html2pdf().set({
    margin: 0.5,
    filename: `invoice_${new Date().getTime()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  }).from(element).save();
}

// =====================
// Load Inventory
// =====================
async function loadInventory() {
  showPage("inventory");
  const table = document.getElementById("inventoryTable");

  const res = await fetch(`${API_URL}?action=getInventory`);
  const data = await res.json();

  let html = `<thead>
      <tr><th>ID</th><th>Name</th><th>Price</th><th>Stock</th></tr>
    </thead><tbody>`;

  if (Array.isArray(data) && data.length > 1) {
    data.slice(1).forEach(row => {
      html += `<tr>
        <td>${escapeHtml(row[0])}</td>
        <td>${escapeHtml(row[1])}</td>
        <td>${escapeHtml(row[2])}</td>
        <td>${escapeHtml(row[3])}</td>
      </tr>`;
    });
  }

  html += "</tbody>";
  if (table) table.innerHTML = html;
}

// =====================
// Load Sales
// =====================
// Supports both older format (no party) and new format (InvoiceID, Date, Party, Item, Qty, Price, Total)
// It skips the header row
async function loadSales() {
  showPage("sales");
  const table = document.getElementById("salesTable");
  const totalDiv = document.getElementById("salesGrandTotal");

  const res = await fetch(`${API_URL}?action=getSales`);
  const data = await res.json();

  let grandTotal = 0;
  let html = `<thead>
    <tr><th>Invoice ID</th><th>Date</th><th>Party</th><th>Items</th><th>Total</th></tr>
  </thead><tbody>`;

  if (!Array.isArray(data) || data.length <= 1) {
    html += `<tr><td colspan="5">No sales found</td></tr>`;
  } else {
    // Group rows by invoice id if your sheet stores each item as separate row with same InvoiceID
    // But since sheet format varies, we'll attempt a reasonable display:
    // If a row has 6 columns (old): [id,date,item,qty,price,total]
    // If a row has 7+ columns (new): [id,date,party,item,qty,price,total]
    // We'll aggregate items per invoice for a nicer view.

    const rows = data.slice(1); // skip header
    const invoices = {}; // invoiceId -> { date, party, items: [{item,qty,price,total}], total }

    rows.forEach(r => {
      // normalize length
      if (r.length >= 7) {
        // [id,date,party,item,qty,price,total]
        const [id, date, party, itemName, qty, price, totalStr] = r;
        if (!invoices[id]) invoices[id] = { date, party: party || "", items: [], total: 0 };
        const t = Number(totalStr) || (Number(qty) * Number(price) || 0);
        invoices[id].items.push({ item: itemName, qty, price, total: t });
        invoices[id].total += t;
      } else if (r.length === 6) {
        // [id,date,itemName,qty,price,total]
        const [id, date, itemName, qty, price, totalStr] = r;
        if (!invoices[id]) invoices[id] = { date, party: "", items: [], total: 0 };
        const t = Number(totalStr) || (Number(qty) * Number(price) || 0);
        invoices[id].items.push({ item: itemName, qty, price, total: t });
        invoices[id].total += t;
      } else {
        // unexpected shape - show joined cells
        const id = r[0] || "Unknown";
        if (!invoices[id]) invoices[id] = { date: r[1] || "", party: "", items: [], total: 0 };
        invoices[id].items.push({ item: r.slice(2).join(" | "), qty: "", price: "", total: 0 });
      }
    });

    Object.keys(invoices).forEach(invId => {
      const inv = invoices[invId];
      const itemsText = inv.items.map(it => `${it.item} (x${it.qty})`).join(", ");
      const total = Number(inv.total) || 0;
      grandTotal += total;
      html += `<tr>
        <td>${escapeHtml(invId)}</td>
        <td>${escapeHtml(inv.date)}</td>
        <td>${escapeHtml(inv.party || "")}</td>
        <td>${escapeHtml(itemsText)}</td>
        <td>${total.toFixed(2)}</td>
      </tr>`;
    });
  }

  html += "</tbody>";
  if (table) table.innerHTML = html;
  if (totalDiv) totalDiv.innerHTML = `<h3>Total Sales: ${grandTotal.toFixed(2)}</h3>`;
}

// Load Purchases - SIMPLIFIED VIEW
// =====================
async function loadPurchases() {
  showPage("purchases");
  const table = document.getElementById("purchasesTable");
  const totalDiv = document.getElementById("purchasesGrandTotal");

  try {
    const res = await fetch(`${API_URL}?action=getPurchases`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    console.log("Purchases data:", data);

    // Store the data for filtering and invoice details
    window.allPurchasesData = processPurchasesData(data);
    
    renderPurchasesTable(window.allPurchasesData);
    
  } catch (err) {
    console.error("Failed to load purchases:", err);
    showError("Failed to load purchases: " + err.message);
  }
}

// Process purchases data and group by invoice
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

// Render purchases table
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
    html += `<tr><td colspan="4" style="text-align: center; padding: 20px;">No purchases found</td></tr>`;
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
        <td style="text-align: center; font-weight: bold;">${escapeHtml(purchase.invoiceId)}</td>
        <td>${escapeHtml(purchase.party || "N/A")}</td>
        <td style="text-align: right; font-weight: bold; color: #28a745;">₹${purchase.total.toFixed(2)}</td>
      </tr>`;
    });

    if (filteredCount === 0 && filter) {
      html += `<tr><td colspan="4" style="text-align: center; padding: 20px;">
        No purchases match your search
      </td></tr>`;
    }
  }

  html += "</tbody>";
  if (table) table.innerHTML = html;
  
  if (totalDiv) {
    const filterText = filter ? ` (Filtered)` : '';
    totalDiv.innerHTML = `<h3>Total Purchases: ₹${grandTotal.toFixed(2)}${filterText}</h3>`;
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

// Filter purchases
function filterPurchases() {
  const searchBox = document.getElementById("purchasesSearch");
  const filter = searchBox ? searchBox.value.trim() : "";
  renderPurchasesTable(window.allPurchasesData, filter);
}

// Show purchase invoice details
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

  // Show the invoice page with purchase details
  showInvoicePage(
    purchase.invoiceId,
    purchase.date,
    purchase.items,
    "Purchase",
    purchase.party,
    purchase.total
  );
}

// =====================
// Enter key shortcuts
// =====================
const salePriceEl = document.getElementById("salePrice");
if (salePriceEl) salePriceEl.addEventListener("keypress", e => { if (e.key === "Enter") addSaleItemToInvoice(); });
const purchasePriceEl = document.getElementById("purchasePrice");
if (purchasePriceEl) purchasePriceEl.addEventListener("keypress", e => { if (e.key === "Enter") addPurchaseItemToInvoice(); });

// =====================
// Keyboard Shortcuts
// =====================
document.addEventListener("keydown", function (e) {
  // Alt + S => Open Sales Invoice
  if (e.altKey && e.key.toLowerCase() === "s") {
    e.preventDefault();
    showPage("salesInvoice");
  }

  // Alt + P => Open Purchase Invoice
  if (e.altKey && e.key.toLowerCase() === "p") {
    e.preventDefault();
    showPage("purchaseInvoice");
  }

  // Alt + Enter => Save Invoice
  if (e.altKey && e.key === "Enter") {
    e.preventDefault();
    const salesVisible = !document.getElementById("salesInvoice").classList.contains("hidden");
    const purchaseVisible = !document.getElementById("purchaseInvoice").classList.contains("hidden");

    if (salesVisible) saveSaleInvoice();
    if (purchaseVisible) savePurchaseInvoice();
  }
});

// =====================
// Enter => Next Input Focus
// =====================
document.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.altKey) {
    const formInputs = Array.from(
      document.querySelectorAll("input, select")
    ).filter(el => el.offsetParent !== null); // only visible

    const currentIndex = formInputs.indexOf(document.activeElement);
    if (currentIndex > -1 && currentIndex < formInputs.length - 1) {
      e.preventDefault();
      formInputs[currentIndex + 1].focus();
    }
  }
});

// =====================
// Date Formatter
// =====================
function formatDate(date = new Date()) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// =====================
// small util: escape html
// =====================
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Helper function to show errors
function showError(message) {
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
