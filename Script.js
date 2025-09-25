// =====================
// Google Apps Script URL
// =====================
const API_URL = "https://script.google.com/macros/s/AKfycbwF4Y79ioyc_zYfsUIGqSUVujHMT3Ig3_o2RjiqG5yYw5EO15ShecdlkNimer56ciuuQg/exec";

// =====================
// Page Switching
// =====================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const page = document.getElementById(id);
  page.classList.remove('hidden');

  // Focus the first input/select/button
  const firstInput = page.querySelector('input, select, button');
  if (firstInput) firstInput.focus();

  if (id === "salesInvoice" || id === "purchaseInvoice") {
    loadItemsDropdown();
  }
}

// =====================
// Load Items into Dropdowns (Keyboard-friendly)
// =====================
async function loadItemsDropdown() {
  const res = await fetch(`${API_URL}?action=getInventory`);
  const data = await res.json();
  const items = data.slice(1).map(row => row[1]);

  const saleInput = document.getElementById("saleItem");
  const purchaseInput = document.getElementById("purchaseItem");
  const saleList = document.getElementById("saleItemsList");
  const purchaseList = document.getElementById("purchaseItemsList");

  saleList.innerHTML = "";
  purchaseList.innerHTML = "";

  items.forEach(item => {
    saleList.appendChild(new Option(item, item));
    purchaseList.appendChild(new Option(item, item));
  });

  // Clear inputs
  saleInput.value = "";
  purchaseInput.value = "";
}

// =====================
// TEMP ARRAYS
// =====================
let tempSaleItems = [];
let tempPurchaseItems = [];

// =====================
// Add Sale Item to Invoice
// =====================
function addSaleItemToInvoice() {
  const item = document.getElementById("saleItem").value.trim();
  const qty = Number(document.getElementById("saleQty").value);
  const price = Number(document.getElementById("salePrice").value);

  if (!item || qty <= 0 || price <= 0) {
    alert("Please enter valid values!");
    return;
  }

  const total = qty * price;
  tempSaleItems.push({ item, qty, price, total });
  renderSaleInvoiceTable();

  document.getElementById("saleQty").value = "";
  document.getElementById("salePrice").value = "";
  document.getElementById("saleItem").focus();
}

// =====================
// Render Sale Invoice Table
// =====================
function renderSaleInvoiceTable() {
  const table = document.getElementById("saleInvoiceTable");
  let html = `<thead>
      <tr>
        <th>Item</th><th>Qty</th><th>Price</th><th>Total</th><th>Action</th>
      </tr>
    </thead>
    <tbody>`;

  tempSaleItems.forEach((row, index) => {
    html += `<tr>
      <td>${row.item}</td>
      <td>${row.qty}</td>
      <td>${row.price}</td>
      <td>${row.total}</td>
      <td><button onclick="removeSaleItem(${index})">Remove</button></td>
    </tr>`;
  });

  html += "</tbody>";
  table.innerHTML = html;
}

// =====================
// Remove Sale Item
// =====================
function removeSaleItem(index) {
  tempSaleItems.splice(index, 1);
  renderSaleInvoiceTable();
}

// =====================
// Save Sale Invoice
// =====================
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

  const savedItems = [...tempSaleItems];
  tempSaleItems = [];
  renderSaleInvoiceTable();

  showInvoicePage(invoiceId, date, savedItems, "Sale");
}

// =====================
// Add Purchase Item to Invoice
// =====================
function addPurchaseItemToInvoice() {
  const item = document.getElementById("purchaseItem").value.trim();
  const qty = Number(document.getElementById("purchaseQty").value);
  const price = Number(document.getElementById("purchasePrice").value);

  if (!item || qty <= 0 || price <= 0) {
    alert("Please enter valid values!");
    return;
  }

  const total = qty * price;
  tempPurchaseItems.push({ item, qty, price, total });
  renderPurchaseInvoiceTable();

  document.getElementById("purchaseQty").value = "";
  document.getElementById("purchasePrice").value = "";
  document.getElementById("purchaseItem").focus();
}

// =====================
// Render Purchase Invoice Table
// =====================
function renderPurchaseInvoiceTable() {
  const table = document.getElementById("purchaseInvoiceTable");
  let html = `<thead>
      <tr>
        <th>Item</th><th>Qty</th><th>Price</th><th>Total</th><th>Action</th>
      </tr>
    </thead>
    <tbody>`;

  tempPurchaseItems.forEach((row, index) => {
    html += `<tr>
      <td>${row.item}</td>
      <td>${row.qty}</td>
      <td>${row.price}</td>
      <td>${row.total}</td>
      <td><button onclick="removePurchaseItem(${index})">Remove</button></td>
    </tr>`;
  });

  html += "</tbody>";
  table.innerHTML = html;
}

// =====================
// Remove Purchase Item
// =====================
function removePurchaseItem(index) {
  tempPurchaseItems.splice(index, 1);
  renderPurchaseInvoiceTable();
}

// =====================
// Save Purchase Invoice
// =====================
async function savePurchaseInvoice() {
  if (tempPurchaseItems.length === 0) {
    alert("Add at least one item to save invoice!");
    return;
  }

  const date = new Date().toLocaleDateString();
  const payload = encodeURIComponent(JSON.stringify({ date, items: tempPurchaseItems }));
  const url = `${API_URL}?action=addPurchaseInvoice&data=${payload}`;

  const res = await fetch(url);
  const invoiceId = await res.text();

  const savedItems = [...tempPurchaseItems];
  tempPurchaseItems = [];
  renderPurchaseInvoiceTable();

  showInvoicePage(invoiceId, date, savedItems, "Purchase");
}

// =====================
// Show Invoice Page
// =====================
function showInvoicePage(invoiceId, date, items, type) {
  const container = document.getElementById("invoicePage");
  if (!container) return alert("Invoice container not found!");

  let grandTotal = 0;
  let html = `<div style="position: relative;">
      <h2 style="margin:0;">${type} Invoice</h2>
      <div id="invoiceActions" style="position:absolute; top:0; right:0;">
        <button onclick="printInvoice()" style="margin-right:5px;">Print</button>
        <button onclick="downloadInvoicePDF()">Download</button>
      </div>
    </div>
    <p><b>Invoice ID:</b> ${invoiceId}</p>
    <p><b>Date:</b> ${date}</p>
    <table border="1" width="100%" style="border-collapse: collapse;">
      <thead>
        <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
      </thead>
      <tbody>`;

  items.forEach(row => {
    html += `<tr>
      <td>${row.item}</td>
      <td>${row.qty}</td>
      <td>${row.price}</td>
      <td>${row.total}</td>
    </tr>`;
    grandTotal += row.total;
  });

  html += `<tr style="font-weight:bold; background:#f0f0f0;">
      <td colspan="3" style="text-align:right">Grand Total:</td>
      <td>${grandTotal}</td>
    </tr>
    </tbody>
  </table>`;

  container.innerHTML = html;
  showPage("invoicePage");
}

// =====================
// Print Invoice
// =====================
function printInvoice() {
  const invoiceContent = document.getElementById("invoicePage").cloneNode(true);
  invoiceContent.querySelectorAll("button").forEach(btn => btn.remove());

  const newWin = window.open("", "_blank");
  newWin.document.write(`
    <html>
      <head>
        <title>Invoice</title>
        <style>
          table { width:100%; border-collapse: collapse; }
          th, td { border:1px solid #000; padding:8px; text-align:left; }
          th { background:#f0f0f0; }
        </style>
      </head>
      <body>${invoiceContent.innerHTML}</body>
    </html>
  `);
  newWin.document.close();
  newWin.print();
}

// =====================
// Download Invoice as PDF
// =====================
async function downloadInvoicePDF() {
  const element = document.getElementById("invoicePage");

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
// Enable Enter key for adding items
// =====================
document.getElementById("salePrice").addEventListener("keypress", e => { if(e.key==="Enter") addSaleItemToInvoice(); });
document.getElementById("purchasePrice").addEventListener("keypress", e => { if(e.key==="Enter") addPurchaseItemToInvoice(); });
