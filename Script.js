// Your Google Apps Script URL
const API_URL = "https://script.google.com/macros/s/AKfycbyoNtZddNqpgOFx2So63zgKURClLTnQkdVogAsHjqDEUL2AYzXVHPFE5x5uopu6jIWh_g/exec";

// -------------------------------------
// Page switching
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');

  if (id === "salesInvoice" || id === "purchaseInvoice") {
    loadItemsDropdown();
  }
}

// -------------------------------------
// Add new item
async function addItem() {
  const name = encodeURIComponent(document.getElementById("itemName").value);
  const price = encodeURIComponent(document.getElementById("itemPrice").value);
  const stock = encodeURIComponent(document.getElementById("itemStock").value);

  const url = `${API_URL}?action=addItem&name=${name}&price=${price}&stock=${stock}`;

  const res = await fetch(url);
  const newId = await res.text();

  alert("Item Added! Item ID: " + newId);
  document.getElementById("itemName").value = "";
  document.getElementById("itemPrice").value = "";
  document.getElementById("itemStock").value = "";
}

// -------------------------------------
// Load items into dropdowns
async function loadItemsDropdown() {
  const res = await fetch(`${API_URL}?action=getInventory`);
  const data = await res.json();

  const items = data.slice(1).map(row => row[1]); // skip header row

  const saleSelect = document.getElementById("saleItem");
  const purchaseSelect = document.getElementById("purchaseItem");

  saleSelect.innerHTML = "";
  purchaseSelect.innerHTML = "";

  items.forEach(item => {
    const option1 = new Option(item, item);
    const option2 = new Option(item, item);
    saleSelect.add(option1);
    purchaseSelect.add(option2);
  });
}

// -------------------------------------
// Add sale
async function addSale() {
  const date = encodeURIComponent(new Date().toLocaleDateString());
  const item = encodeURIComponent(document.getElementById("saleItem").value);
  const qty = encodeURIComponent(document.getElementById("saleQty").value);
  const total = encodeURIComponent(document.getElementById("saleTotal").value);

  const url = `${API_URL}?action=addSale&date=${date}&item=${item}&qty=${qty}&total=${total}`;

  const res = await fetch(url);
  const newId = await res.text();

  alert("Sale Recorded! Invoice ID: " + newId);
  document.getElementById("saleQty").value = "";
  document.getElementById("saleTotal").value = "";
}

// -------------------------------------
// Add purchase
async function addPurchase() {
  const date = encodeURIComponent(new Date().toLocaleDateString());
  const item = encodeURIComponent(document.getElementById("purchaseItem").value);
  const qty = encodeURIComponent(document.getElementById("purchaseQty").value);
  const cost = encodeURIComponent(document.getElementById("purchaseCost").value);

  const url = `${API_URL}?action=addPurchase&date=${date}&item=${item}&qty=${qty}&cost=${cost}`;

  const res = await fetch(url);
  const newId = await res.text();

  alert("Purchase Recorded! Invoice ID: " + newId);
  document.getElementById("purchaseQty").value = "";
  document.getElementById("purchaseCost").value = "";
}

// -------------------------------------
// Load inventory table
async function loadInventory() {
  const res = await fetch(`${API_URL}?action=getInventory`);
  const data = await res.json();
  const table = document.getElementById("inventoryTable");

  let html = `<tr>
      <th>ID</th>
      <th>Name</th>
      <th>Price</th>
      <th>Stock</th>
    </tr>`;

  data.slice(1).forEach((row, i) => {
    html += `<tr style="background-color:${i % 2 === 0 ? '#f9f9f9' : '#ffffff'}">
      ${row.map(c => `<td>${c}</td>`).join("")}
    </tr>`;
  });

  table.innerHTML = html;
  showPage("inventory");
}

// -------------------------------------
// Load sales table with totals
async function loadSales() {
  const res = await fetch(`${API_URL}?action=getSales`);
  const data = await res.json();
  const table = document.getElementById("salesTable");

  let html = `<tr>
      <th>InvoiceID</th>
      <th>Date</th>
      <th>Item</th>
      <th>Qty</th>
      <th>Total</th>
    </tr>`;

  let grandTotal = 0;

  data.slice(1).forEach((row, i) => {
    html += `<tr style="background-color:${i % 2 === 0 ? '#f9f9f9' : '#ffffff'}">
      ${row.map(c => `<td>${c}</td>`).join("")}
    </tr>`;
    grandTotal += Number(row[4]) || 0;
  });

  html += `<tr style="font-weight:bold; background-color:#e0e0e0">
    <td colspan="4" style="text-align:right">Grand Total:</td>
    <td>${grandTotal}</td>
  </tr>`;

  table.innerHTML = html;
  showPage("sales");
}
// Temporary arrays to store items for invoice
let tempSaleItems = [];
let tempPurchaseItems = [];

// --------------------------
// Add item to sales invoice table (client-side)
function addSaleItemToInvoice() {
  const item = document.getElementById("saleItem").value;
  const qty = Number(document.getElementById("saleQty").value);
  const total = Number(document.getElementById("saleTotal").value);

  if (!item || qty <= 0 || total <= 0) {
    alert("Please enter valid values!");
    return;
  }

  tempSaleItems.push({ item, qty, total });
  renderSaleInvoiceTable();
  document.getElementById("saleQty").value = "";
  document.getElementById("saleTotal").value = "";
}

// Render sales invoice table dynamically
function renderSaleInvoiceTable() {
  const table = document.getElementById("saleInvoiceTable");
  table.innerHTML = `<tr>
    <th>Item</th><th>Qty</th><th>Total</th><th>Action</th>
  </tr>`;

  tempSaleItems.forEach((row, index) => {
    table.innerHTML += `<tr>
      <td>${row.item}</td>
      <td>${row.qty}</td>
      <td>${row.total}</td>
      <td><button onclick="removeSaleItem(${index})">Remove</button></td>
    </tr>`;
  });
}

// Remove item from temp array
function removeSaleItem(index) {
  tempSaleItems.splice(index, 1);
  renderSaleInvoiceTable();
}

// Save invoice (send all items to Apps Script)
async function saveSaleInvoice() {
  if (tempSaleItems.length === 0) {
    alert("Add at least one item to save invoice!");
    return;
  }

  const date = new Date().toLocaleDateString();
  const itemsParam = encodeURIComponent(JSON.stringify(tempSaleItems));

  const url = `${API_URL}?action=addSaleInvoice&date=${encodeURIComponent(date)}&items=${itemsParam}`;
  const res = await fetch(url);
  const invoiceId = await res.text();

  alert("Sales Invoice Saved! Invoice ID: " + invoiceId);

  tempSaleItems = [];
  renderSaleInvoiceTable();
}


