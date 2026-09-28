// ─── Tests Catalog Management Page ───
async function renderTests() {
  const pc = document.getElementById('pageContent');
  pc.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h3 style="color:var(--text-secondary)">Lab Tests Catalog</h3>
      <button class="btn btn-primary" onclick="showAddTestModal()">+ Add New Test</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-wrapper"><table>
      <thead><tr><th>ID</th><th>Test Name</th><th>Category</th><th>Price</th><th>Reference Range</th><th>Unit</th><th>TAT (hrs)</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="testsTable"><tr><td colspan="9"><div class="spinner"></div></td></tr></tbody>
    </table></div></div></div>`;
  loadTests();
}

async function loadTests() {
  const tests = await api('/api/tests');
  document.getElementById('testsTable').innerHTML = tests.length === 0
    ? '<tr><td colspan="9"><div class="empty-state"><div class="icon">🔬</div><h4>No tests in catalog</h4></div></td></tr>'
    : tests.map(t => `<tr>
        <td>#${t.TestID}</td><td><strong>${t.TestName}</strong></td><td>${t.Category||'-'}</td>
        <td>Rs ${t.Price}</td><td>${t.ReferenceRange||'-'}</td><td>${t.Unit||'-'}</td><td>${t.TurnaroundHours}</td>
        <td><span class="badge ${t.IsActive?'badge-success':'badge-danger'}">${t.IsActive?'Active':'Inactive'}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="editTest(${t.TestID}, '${t.TestName}', '${t.Category}', ${t.Price}, '${t.ReferenceRange}', '${t.Unit}', ${t.TurnaroundHours}, ${t.IsActive})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteTest(${t.TestID})">🗑️</button>
        </td></tr>`).join('');
}

function showAddTestModal() {
  showModal('Add New Test', `
    <div class="form-row">
      <div class="form-group"><label>Test Name *</label><input class="form-control" id="tName"></div>
      <div class="form-group"><label>Category</label><select class="form-control" id="tCat"><option>Hematology</option><option>Biochemistry</option><option>Microbiology</option><option>Endocrinology</option><option>Radiology</option><option>Serology</option><option>Other</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Price (Rs) *</label><input class="form-control" type="number" id="tPrice" value="0"></div>
      <div class="form-group"><label>Turnaround Time (Hours)</label><input class="form-control" type="number" id="tTAT" value="24"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Reference Range</label><input class="form-control" id="tRef" placeholder="e.g. 70-100"></div>
      <div class="form-group"><label>Unit</label><input class="form-control" id="tUnit" placeholder="e.g. mg/dL"></div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="addTest()">Add Test</button>`);
}

async function addTest() {
  const body = {
    TestName: document.getElementById('tName').value,
    Category: document.getElementById('tCat').value,
    Price: parseFloat(document.getElementById('tPrice').value) || 0,
    TurnaroundHours: parseInt(document.getElementById('tTAT').value) || 24,
    ReferenceRange: document.getElementById('tRef').value,
    Unit: document.getElementById('tUnit').value
  };
  if (!body.TestName) return toast('Test name is required', 'error');
  try { await api('/api/tests', { method: 'POST', body }); closeModal(); toast('Test added!'); loadTests(); }
  catch(e) { toast(e.message, 'error'); }
}

function editTest(id, name, cat, price, ref, unit, tat, isActive) {
  showModal('Edit Test', `
    <div class="form-row">
      <div class="form-group"><label>Test Name</label><input class="form-control" id="etName" value="${name}"></div>
      <div class="form-group"><label>Category</label><input class="form-control" id="etCat" value="${cat}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Price (Rs)</label><input class="form-control" type="number" id="etPrice" value="${price}"></div>
      <div class="form-group"><label>TAT (Hours)</label><input class="form-control" type="number" id="etTAT" value="${tat}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Reference Range</label><input class="form-control" id="etRef" value="${ref!=='null'?ref:''}"></div>
      <div class="form-group"><label>Unit</label><input class="form-control" id="etUnit" value="${unit!=='null'?unit:''}"></div>
    </div>
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="etActive" ${isActive?'checked':''}> Active Test</label>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="updateTest(${id})">Update Test</button>`);
}

async function updateTest(id) {
  try {
    await api(`/api/tests/${id}`, { method: 'PUT', body: {
      TestName: document.getElementById('etName').value,
      Category: document.getElementById('etCat').value,
      Price: parseFloat(document.getElementById('etPrice').value) || 0,
      TurnaroundHours: parseInt(document.getElementById('etTAT').value) || 24,
      ReferenceRange: document.getElementById('etRef').value,
      Unit: document.getElementById('etUnit').value,
      IsActive: document.getElementById('etActive').checked
    }});
    closeModal(); toast('Test updated!'); loadTests();
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteTest(id) {
  if (!confirm('Delete this test?')) return;
  try { await api(`/api/tests/${id}`, { method: 'DELETE' }); toast('Test deleted'); loadTests(); }
  catch(e) { toast(e.message, 'error'); }
}
