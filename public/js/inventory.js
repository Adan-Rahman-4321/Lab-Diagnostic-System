// ─── Inventory Management Page ───
async function renderInventory() {
  const pc = document.getElementById('pageContent');
  pc.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h3 style="color:var(--text-secondary)">Stock & Supply Management</h3>
      <div style="display:flex;gap:10px">
        <button class="btn btn-warning btn-sm" onclick="showLowStockAlerts()">⚠ Low Stock Alerts</button>
        <button class="btn btn-primary" onclick="showAddInventoryModal()">+ Add Item</button>
      </div>
    </div>
    <div class="card"><div class="card-body"><div class="table-wrapper"><table>
      <thead><tr><th>ID</th><th>Item Name</th><th>Category</th><th>Quantity</th><th>Unit</th><th>Min Level</th><th>Unit Cost</th><th>Supplier</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="inventoryTable"><tr><td colspan="10"><div class="spinner"></div></td></tr></tbody>
    </table></div></div></div>`;
  loadInventory();
}

async function loadInventory() {
  const items = await api('/api/inventory');
  document.getElementById('inventoryTable').innerHTML = items.length === 0
    ? '<tr><td colspan="10"><div class="empty-state"><div class="icon">📦</div><h4>No items</h4></div></td></tr>'
    : items.map(i => {
      const low = i.Quantity <= i.MinStockLevel;
      return `<tr style="${low?'background:var(--danger-bg)':''}">
        <td>#${i.ItemID}</td><td><strong>${i.ItemName}</strong></td><td>${i.Category||'-'}</td>
        <td style="font-weight:700;color:${low?'var(--danger)':'var(--success)'}">${i.Quantity}</td>
        <td>${i.Unit||'-'}</td><td>${i.MinStockLevel}</td><td>Rs ${i.UnitCost||0}</td><td>${i.Supplier||'-'}</td>
        <td>${low?'<span class="badge badge-danger">Low Stock</span>':'<span class="badge badge-success">OK</span>'}</td>
        <td>
          <button class="btn btn-success btn-sm" onclick="showAdjustStockModal(${i.ItemID},'${i.ItemName}',${i.Quantity})">±</button>
          <button class="btn btn-danger btn-sm" onclick="deleteInventoryItem(${i.ItemID})">🗑️</button>
        </td></tr>`;
    }).join('');
}

function showAddInventoryModal() {
  showModal('Add Inventory Item', `
    <div class="form-row">
      <div class="form-group"><label>Item Name *</label><input class="form-control" id="invName"></div>
      <div class="form-group"><label>Category</label><select class="form-control" id="invCat"><option>Consumables</option><option>Reagents</option><option>PPE</option><option>Stationery</option><option>Equipment</option><option>Other</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Quantity</label><input class="form-control" type="number" id="invQty" value="0"></div>
      <div class="form-group"><label>Unit</label><input class="form-control" id="invUnit" placeholder="Pcs, Bottles, etc."></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Min Stock Level</label><input class="form-control" type="number" id="invMin" value="10"></div>
      <div class="form-group"><label>Unit Cost (Rs)</label><input class="form-control" type="number" id="invCost" value="0"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Supplier</label><input class="form-control" id="invSupplier"></div>
      <div class="form-group"><label>Expiry Date</label><input class="form-control" type="date" id="invExpiry"></div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="addInventoryItem()">Add Item</button>`);
}

async function addInventoryItem() {
  const body = {
    ItemName: document.getElementById('invName').value,
    Category: document.getElementById('invCat').value,
    Quantity: parseInt(document.getElementById('invQty').value) || 0,
    Unit: document.getElementById('invUnit').value,
    MinStockLevel: parseInt(document.getElementById('invMin').value) || 10,
    UnitCost: parseFloat(document.getElementById('invCost').value) || 0,
    Supplier: document.getElementById('invSupplier').value,
    ExpiryDate: document.getElementById('invExpiry').value || null
  };
  if (!body.ItemName) return toast('Item name is required', 'error');
  try { await api('/api/inventory', { method: 'POST', body }); closeModal(); toast('Item added!'); loadInventory(); }
  catch(e) { toast(e.message, 'error'); }
}

function showAdjustStockModal(id, name, current) {
  showModal(`Adjust Stock: ${name}`, `
    <div class="alert alert-info">Current Stock: <strong>${current}</strong></div>
    <div class="form-group"><label>Type</label><select class="form-control" id="adjType"><option value="In">Stock In (+)</option><option value="Out">Stock Out (-)</option></select></div>
    <div class="form-group"><label>Quantity</label><input class="form-control" type="number" id="adjQty" min="1" value="1"></div>
    <div class="form-group"><label>Note</label><input class="form-control" id="adjNote" placeholder="Reason for adjustment"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="adjustStock(${id})">Update Stock</button>`);
}

async function adjustStock(id) {
  try {
    await api(`/api/inventory/${id}/adjust`, { method: 'POST', body: {
      ChangeType: document.getElementById('adjType').value,
      Quantity: parseInt(document.getElementById('adjQty').value),
      Note: document.getElementById('adjNote').value
    }});
    closeModal(); toast('Stock updated!'); loadInventory();
  } catch(e) { toast(e.message, 'error'); }
}

async function showLowStockAlerts() {
  const alerts = await api('/api/inventory/alerts');
  showModal('⚠ Low Stock Alerts', alerts.length === 0
    ? '<div class="alert alert-success">All items are above minimum stock levels! ✓</div>'
    : `<table><thead><tr><th>Item</th><th>Current</th><th>Min Level</th><th>Supplier</th></tr></thead>
       <tbody>${alerts.map(a => `<tr><td><strong>${a.ItemName}</strong></td><td style="color:var(--danger);font-weight:700">${a.Quantity}</td><td>${a.MinStockLevel}</td><td>${a.Supplier||'-'}</td></tr>`).join('')}</tbody></table>`);
}

async function deleteInventoryItem(id) {
  if (!confirm('Delete this item?')) return;
  try { await api(`/api/inventory/${id}`, { method: 'DELETE' }); toast('Item deleted'); loadInventory(); }
  catch(e) { toast(e.message, 'error'); }
}
