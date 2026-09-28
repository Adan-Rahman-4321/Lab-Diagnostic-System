// ─── Slot Management Page ───
async function renderSlots() {
  const today = new Date().toISOString().split('T')[0];
  const pc = document.getElementById('pageContent');
  pc.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px">
        <label style="color:var(--text-secondary);font-size:0.85rem">Filter Date:</label>
        <input class="form-control" type="date" id="slotDateFilter" value="${today}" onchange="loadSlots()" style="width:200px">
      </div>
      <button class="btn btn-primary" onclick="showAddSlotModal()">+ Create Slot</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-wrapper"><table>
      <thead><tr><th>ID</th><th>Date</th><th>Start</th><th>End</th><th>Type</th><th>Capacity</th><th>Booked</th><th>Available</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="slotsTable"><tr><td colspan="10"><div class="spinner"></div></td></tr></tbody>
    </table></div></div></div>`;
  loadSlots();
}

async function loadSlots() {
  const date = document.getElementById('slotDateFilter').value;
  const slots = await api(`/api/slots?date=${date}`);
  document.getElementById('slotsTable').innerHTML = slots.length === 0
    ? '<tr><td colspan="10"><div class="empty-state"><div class="icon">🕐</div><h4>No slots for this date</h4></div></td></tr>'
    : slots.map(s => {
      const avail = s.Capacity - s.Booked;
      const pct = (s.Booked / s.Capacity * 100).toFixed(0);
      return `<tr>
        <td>#${s.SlotID}</td><td>${s.Date}</td><td>${s.StartTime}</td><td>${s.EndTime}</td>
        <td><span class="badge ${s.SlotType==='Emergency'?'badge-danger':s.SlotType==='VIP'?'badge-warning':'badge-info'}">${s.SlotType}</span></td>
        <td>${s.Capacity}</td><td>${s.Booked}</td>
        <td><span class="badge ${avail>0?'badge-success':'badge-danger'}">${avail}</span></td>
        <td><span class="badge ${s.Status==='Active'?'badge-success':s.Status==='Full'?'badge-danger':'badge-secondary'}">${s.Status}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="editSlot(${s.SlotID},'${s.Date}','${s.StartTime}','${s.EndTime}',${s.Capacity},'${s.Status}','${s.SlotType}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteSlot(${s.SlotID})">🗑️</button>
        </td></tr>`;
    }).join('');
}

function showAddSlotModal() {
  const today = new Date().toISOString().split('T')[0];
  showModal('Create New Slot', `
    <div class="form-row">
      <div class="form-group"><label>Date *</label><input class="form-control" type="date" id="sDate" value="${today}"></div>
      <div class="form-group"><label>Slot Type</label><select class="form-control" id="sType"><option>Regular</option><option>Emergency</option><option>VIP</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Start Time *</label><input class="form-control" type="time" id="sStart" value="09:00"></div>
      <div class="form-group"><label>End Time *</label><input class="form-control" type="time" id="sEnd" value="10:00"></div>
    </div>
    <div class="form-group"><label>Capacity</label><input class="form-control" type="number" id="sCap" value="10" min="1"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="saveSlot()">Create Slot</button>`);
}

async function saveSlot() {
  try {
    await api('/api/slots', { method: 'POST', body: { Date: document.getElementById('sDate').value, StartTime: document.getElementById('sStart').value, EndTime: document.getElementById('sEnd').value, Capacity: parseInt(document.getElementById('sCap').value), SlotType: document.getElementById('sType').value }});
    closeModal(); toast('Slot created!'); loadSlots();
  } catch(e) { toast(e.message, 'error'); }
}

function editSlot(id, date, start, end, cap, status, type) {
  showModal('Edit Slot', `
    <div class="form-row">
      <div class="form-group"><label>Date</label><input class="form-control" type="date" id="esDate" value="${date}"></div>
      <div class="form-group"><label>Type</label><select class="form-control" id="esType"><option ${type==='Regular'?'selected':''}>Regular</option><option ${type==='Emergency'?'selected':''}>Emergency</option><option ${type==='VIP'?'selected':''}>VIP</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Start</label><input class="form-control" type="time" id="esStart" value="${start}"></div>
      <div class="form-group"><label>End</label><input class="form-control" type="time" id="esEnd" value="${end}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Capacity</label><input class="form-control" type="number" id="esCap" value="${cap}"></div>
      <div class="form-group"><label>Status</label><select class="form-control" id="esStatus"><option ${status==='Active'?'selected':''}>Active</option><option ${status==='Full'?'selected':''}>Full</option><option ${status==='Cancelled'?'selected':''}>Cancelled</option><option ${status==='Completed'?'selected':''}>Completed</option></select></div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="updateSlot(${id})">Update</button>`);
}

async function updateSlot(id) {
  try {
    await api(`/api/slots/${id}`, { method: 'PUT', body: { Date: document.getElementById('esDate').value, StartTime: document.getElementById('esStart').value, EndTime: document.getElementById('esEnd').value, Capacity: parseInt(document.getElementById('esCap').value), Status: document.getElementById('esStatus').value, SlotType: document.getElementById('esType').value }});
    closeModal(); toast('Slot updated!'); loadSlots();
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteSlot(id) {
  if (!confirm('Delete this slot?')) return;
  try { await api(`/api/slots/${id}`, { method: 'DELETE' }); toast('Slot deleted'); loadSlots(); }
  catch(e) { toast(e.message, 'error'); }
}
