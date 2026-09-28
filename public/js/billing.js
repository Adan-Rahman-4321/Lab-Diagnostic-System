// ─── Billing Page ───
async function renderBilling() {
  const pc = document.getElementById('pageContent');
  pc.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h3 style="color:var(--text-secondary)">Invoice & Payment Management</h3>
      <button class="btn btn-primary" onclick="showCreateBillModal()">+ Create Invoice</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-wrapper"><table>
      <thead><tr><th>Invoice #</th><th>Patient</th><th>Total</th><th>Discount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody id="billsTable"><tr><td colspan="9"><div class="spinner"></div></td></tr></tbody>
    </table></div></div></div>`;
  loadBills();
}

async function loadBills() {
  const bills = await api('/api/billing');
  document.getElementById('billsTable').innerHTML = bills.length === 0
    ? '<tr><td colspan="9"><div class="empty-state"><div class="icon">💳</div><h4>No invoices yet</h4></div></td></tr>'
    : bills.map(b => {
      const balance = b.TotalAmount - b.PaidAmount;
      return `<tr>
        <td><strong>${b.InvoiceNo}</strong></td><td>${b.PatientName}</td>
        <td>Rs ${b.TotalAmount.toLocaleString()}</td><td>Rs ${b.Discount}</td>
        <td>Rs ${b.PaidAmount.toLocaleString()}</td>
        <td style="color:${balance>0?'var(--danger)':'var(--success)'}">Rs ${balance.toLocaleString()}</td>
        <td><span class="badge ${b.PaymentStatus==='Paid'?'badge-success':b.PaymentStatus==='Partial'?'badge-warning':'badge-danger'}">${b.PaymentStatus}</span></td>
        <td>${new Date(b.CreatedAt).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="viewBillDetail(${b.BillID})">👁</button>
          ${b.PaymentStatus!=='Paid'?`<button class="btn btn-success btn-sm" onclick="showPaymentModal(${b.BillID},${b.TotalAmount},${b.PaidAmount})">💰 Pay</button>`:''}
        </td></tr>`;
    }).join('');
}

async function showCreateBillModal() {
  const patients = await api('/api/patients');
  const tests = await api('/api/samples/tests');
  showModal('Create Invoice', `
    <div class="form-group"><label>Patient *</label><select class="form-control" id="billPatient">
      <option value="">Select Patient</option>
      ${patients.map(p=>`<option value="${p.PatientID}">${p.Name} (${p.Phone})</option>`).join('')}
    </select></div>
    <div class="form-group"><label>Select Tests *</label><div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:10px">
      ${tests.map(t=>`<label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;color:var(--text-secondary);font-size:0.85rem">
        <input type="checkbox" value="${t.TestID}" data-price="${t.Price}" class="billTest" onchange="updateBillTotal()"> ${t.TestName}
        <span style="margin-left:auto;color:var(--accent)">Rs ${t.Price}</span>
      </label>`).join('')}
    </div></div>
    <div class="form-row">
      <div class="form-group"><label>Subtotal</label><input class="form-control" id="billSubtotal" value="0" readonly></div>
      <div class="form-group"><label>Discount (Rs)</label><input class="form-control" type="number" id="billDiscount" value="0" onchange="updateBillTotal()"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Total</label><input class="form-control" id="billTotal" value="0" readonly style="font-weight:700;color:var(--success)"></div>
      <div class="form-group"><label>Paid Amount</label><input class="form-control" type="number" id="billPaid" value="0"></div>
    </div>
    <div class="form-group"><label>Payment Method</label><select class="form-control" id="billMethod"><option>Cash</option><option>Card</option><option>Online Transfer</option><option>Insurance</option></select></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="createBill()">Generate Invoice</button>`);
}

function updateBillTotal() {
  const checked = document.querySelectorAll('.billTest:checked');
  let sub = 0;
  checked.forEach(c => sub += parseFloat(c.dataset.price));
  const disc = parseFloat(document.getElementById('billDiscount').value) || 0;
  document.getElementById('billSubtotal').value = sub;
  document.getElementById('billTotal').value = sub - disc;
}

async function createBill() {
  const TestIDs = Array.from(document.querySelectorAll('.billTest:checked')).map(e=>parseInt(e.value));
  const body = {
    PatientID: parseInt(document.getElementById('billPatient').value),
    TestIDs,
    Discount: parseFloat(document.getElementById('billDiscount').value) || 0,
    PaidAmount: parseFloat(document.getElementById('billPaid').value) || 0,
    PaymentMethod: document.getElementById('billMethod').value
  };
  if (!body.PatientID || TestIDs.length === 0) return toast('Select patient and tests', 'error');
  try {
    const res = await api('/api/billing', { method: 'POST', body });
    closeModal(); toast(`Invoice ${res.InvoiceNo} created!`); loadBills();
  } catch(e) { toast(e.message, 'error'); }
}

async function viewBillDetail(id) {
  const data = await api(`/api/billing/${id}`);
  const b = data.bill;
  showModal(`Invoice ${b.InvoiceNo}`, `
    <div style="margin-bottom:16px;padding:16px;background:var(--bg-input);border-radius:8px">
      <div class="grid-2"><div><strong>Patient:</strong> ${b.PatientName}</div><div><strong>Phone:</strong> ${b.Phone||'-'}</div>
      <div><strong>CNIC:</strong> ${b.CNIC||'-'}</div><div><strong>Date:</strong> ${new Date(b.CreatedAt).toLocaleDateString()}</div></div>
    </div>
    <table><thead><tr><th>Test</th><th>Category</th><th>Unit Price</th><th>Total</th></tr></thead>
    <tbody>${data.items.map(i=>`<tr><td>${i.TestName}</td><td>${i.Category}</td><td>Rs ${i.UnitPrice}</td><td>Rs ${i.TotalPrice}</td></tr>`).join('')}</tbody>
    </table>
    <div style="margin-top:16px;padding:16px;background:var(--bg-input);border-radius:8px;text-align:right">
      <div>Discount: <strong>Rs ${b.Discount}</strong></div>
      <div style="font-size:1.2rem;color:var(--accent);font-weight:800;margin-top:4px">Total: Rs ${b.TotalAmount.toLocaleString()}</div>
      <div>Paid: Rs ${b.PaidAmount.toLocaleString()} · <span class="badge ${b.PaymentStatus==='Paid'?'badge-success':b.PaymentStatus==='Partial'?'badge-warning':'badge-danger'}">${b.PaymentStatus}</span></div>
    </div>`);
}

function showPaymentModal(id, total, paid) {
  const balance = total - paid;
  showModal('Record Payment', `
    <div class="alert alert-info">Balance Due: <strong>Rs ${balance.toLocaleString()}</strong></div>
    <div class="form-group"><label>Amount</label><input class="form-control" type="number" id="payAmt" value="${balance}"></div>
    <div class="form-group"><label>Method</label><select class="form-control" id="payMethod"><option>Cash</option><option>Card</option><option>Online Transfer</option></select></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-success" onclick="recordPayment(${id},${paid})">Record Payment</button>`);
}

async function recordPayment(id, prevPaid) {
  const amt = parseFloat(document.getElementById('payAmt').value) + prevPaid;
  try {
    await api(`/api/billing/${id}`, { method: 'PUT', body: { PaidAmount: amt, PaymentMethod: document.getElementById('payMethod').value } });
    closeModal(); toast('Payment recorded!'); loadBills();
  } catch(e) { toast(e.message, 'error'); }
}
