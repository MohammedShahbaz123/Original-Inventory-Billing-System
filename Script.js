const API_URL = "https://script.google.com/macros/s/AKfycbzUb-36VNEfaA9SwXSjC5U5696ANu0FJcB1tmZqW2QsM6p50TmvOo3p4s0G48IduCSuHA/exec"; // replace this

    function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');

  if (id === "salesInvoice" || id === "purchaseInvoice") {
    loadItemsDropdown();
  }
}


    async function addItem() {
  const data = {
    name: document.getElementById("itemName").value,
    price: document.getElementById("itemPrice").value,
    stock: document.getElementById("itemStock").value
  };

  let res = await fetch(API_URL + "?action=addItem", {
    method: "POST",
    body: JSON.stringify(data)
  });

  let newId = await res.text();
  alert("Item Added! Item ID: " + newId);
}

async function loadItemsDropdown() {
  const res = await fetch(API_URL + "?action=getInventory");
  const data = await res.json();

  // Get item names (skip header row)
  const items = data.slice(1).map(row => row[1]); 

  let saleSelect = document.getElementById("saleItem");
  let purchaseSelect = document.getElementById("purchaseItem");

  // Clear existing options
  saleSelect.innerHTML = "";
  purchaseSelect.innerHTML = "";

  // Add dropdown options
  items.forEach(item => {
    let option1 = document.createElement("option");
    option1.value = item;
    option1.textContent = item;
    saleSelect.appendChild(option1);

    let option2 = document.createElement("option");
    option2.value = item;
    option2.textContent = item;
    purchaseSelect.appendChild(option2);
  });
}

    async function addSale() {
      const data = {
        invoiceId: Date.now(),
        date: new Date().toLocaleDateString(),
        item: document.getElementById("saleItem").value,
        qty: document.getElementById("saleQty").value,
        total: document.getElementById("saleTotal").value
      };
      await fetch(API_URL + "?action=addSale", {
        method: "POST",
        body: JSON.stringify(data)
      });
      alert("Sale Recorded!");
    }

    async function addPurchase() {
      const data = {
        invoiceId: Date.now(),
        date: new Date().toLocaleDateString(),
        item: document.getElementById("purchaseItem").value,
        qty: document.getElementById("purchaseQty").value,
        cost: document.getElementById("purchaseCost").value
      };
      await fetch(API_URL + "?action=addPurchase", {
        method: "POST",
        body: JSON.stringify(data)
      });
      alert("Purchase Recorded!");
    }

    async function loadInventory() {
      const res = await fetch(API_URL + "?action=getInventory");
      const data = await res.json();
      const table = document.getElementById("inventoryTable");
      table.innerHTML = "<tr><th>ID</th><th>Name</th><th>Price</th><th>Stock</th></tr>" +
        data.slice(1).map(row => `<tr>${row.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("");
      showPage("inventory");
    }

    async function loadSales() {
      const res = await fetch(API_URL + "?action=getSales");
      const data = await res.json();
      const table = document.getElementById("salesTable");
      table.innerHTML = "<tr><th>InvoiceID</th><th>Date</th><th>Item</th><th>Qty</th><th>Total</th></tr>" +
        data.slice(1).map(row => `<tr>${row.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("");
      showPage("sales");
    }