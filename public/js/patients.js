// ─── Patient Management Page ───
async function renderPatients() {
  const pc = document.getElementById('pageContent');
  pc.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div class="search-bar" style="flex:1;max-width:400px"><span class="search-icon">🔍</span><input id="patientSearch" placeholder="Search by name, CNIC, or phone..." onkeyup="searchPatients()"></div>
      <button class="btn btn-primary" onclick="showAddPatientModal()">+ Add Patient</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-wrapper"><table>
      <thead><tr><th>ID</th><th>Name</th><th>Age</th><th>Gender</th><th>CNIC</th><th>Phone</th><th>Blood Group</th><th>Actions</th></tr></thead>
      <tbody id="patientsTable"><tr><td colspan="8"><div class="spinner"></div></td></tr></tbody>
    </table></div></div></div>`;
  loadPatients();
}

async function loadPatients(search = '') {
  const patients = await api(`/api/patients${search ? '?search=' + encodeURIComponent(search) : ''}`);
  document.getElementById('patientsTable').innerHTML = patients.length === 0
    ? '<tr><td colspan="8"><div class="empty-state"><div class="icon">👥</div><h4>No patients found</h4></div></td></tr>'
    : patients.map(p => `<tr>
        <td><strong>#${p.PatientID}</strong></td>
        <td>${p.Name}</td><td>${p.Age || '-'}</td><td>${p.Gender || '-'}</td>
        <td>${p.CNIC || '-'}</td><td>${p.Phone || '-'}</td><td>${p.BloodGroup || '-'}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="editPatient(${p.PatientID})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deletePatient(${p.PatientID})">🗑️</button>
        </td></tr>`).join('');
}

let searchTimer;
function searchPatients() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadPatients(document.getElementById('patientSearch').value), 300);
}

function showAddPatientModal(patient = null) {
  const p = patient || {};
  showModal(patient ? 'Edit Patient' : 'Add New Patient', `
    <input type="hidden" id="editPatientId" value="${p.PatientID || ''}">
    <div class="form-row">
      <div class="form-group"><label>Full Name *</label><input class="form-control" id="pName" value="${p.Name || ''}" required></div>
      <div class="form-group"><label>Age</label><input class="form-control" id="pAge" type="number" value="${p.Age || ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Gender</label><select class="form-control" id="pGender"><option value="">Select</option><option ${p.Gender==='Male'?'selected':''}>Male</option><option ${p.Gender==='Female'?'selected':''}>Female</option><option ${p.Gender==='Other'?'selected':''}>Other</option></select></div>
      <div class="form-group"><label>CNIC</label><input class="form-control" id="pCNIC" placeholder="xxxxx-xxxxxxx-x" value="${p.CNIC || ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Phone *</label><input class="form-control" id="pPhone" value="${p.Phone || ''}" required></div>
      <div class="form-group"><label>Email</label><input class="form-control" id="pEmail" type="email" value="${p.Email || ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Blood Group</label><select class="form-control" id="pBlood"><option value="">Select</option>${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b=>`<option ${p.BloodGroup===b?'selected':''}>${b}</option>`).join('')}</select></div>
      <div class="form-group"><label>Address</label><input class="form-control" id="pAddress" value="${p.Address || ''}"></div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="savePatient()">Save Patient</button>`
  );
}

async function savePatient() {
  const id = document.getElementById('editPatientId').value;
  const body = {
    Name: document.getElementById('pName').value,
    Age: parseInt(document.getElementById('pAge').value) || null,
    Gender: document.getElementById('pGender').value || null,
    CNIC: document.getElementById('pCNIC').value || null,
    Phone: document.getElementById('pPhone').value,
    Email: document.getElementById('pEmail').value || null,
    BloodGroup: document.getElementById('pBlood').value || null,
    Address: document.getElementById('pAddress').value || null,
  };
  if (!body.Name || !body.Phone) return toast('Name and Phone are required', 'error');
  try {
    if (id) { await api(`/api/patients/${id}`, { method: 'PUT', body }); }
    else { await api('/api/patients', { method: 'POST', body }); }
    closeModal(); toast(id ? 'Patient updated!' : 'Patient added!'); loadPatients();
  } catch(e) { toast(e.message, 'error'); }
}

async function editPatient(id) {
  const p = await api(`/api/patients/${id}`);
  showAddPatientModal(p);
}

async function deletePatient(id) {
  if (!confirm('Delete this patient?')) return;
  try { await api(`/api/patients/${id}`, { method: 'DELETE' }); toast('Patient deleted'); loadPatients(); }
  catch(e) { toast(e.message, 'error'); }
}
