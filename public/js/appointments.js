// ─── Appointment Booking Page ───
async function renderAppointments() {
  const today = new Date().toISOString().split('T')[0];
  const pc = document.getElementById('pageContent');
  pc.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div style="display:flex;gap:12px;align-items:center">
        <label style="color:var(--text-secondary);font-size:0.85rem">Date:</label>
        <input class="form-control" type="date" id="apptDateFilter" value="${today}" onchange="loadAppointments()" style="width:200px">
      </div>
      <button class="btn btn-primary" onclick="showBookAppointmentModal()">+ Book Appointment</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-wrapper"><table>
      <thead><tr><th>Token</th><th>Patient</th><th>Phone</th><th>Date</th><th>Slot</th><th>Type</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="apptTable"><tr><td colspan="9"><div class="spinner"></div></td></tr></tbody>
    </table></div></div></div>`;
  loadAppointments();
}

async function loadAppointments() {
  const date = document.getElementById('apptDateFilter').value;
  const appts = await api(`/api/appointments?date=${date}`);
  document.getElementById('apptTable').innerHTML = appts.length === 0
    ? '<tr><td colspan="9"><div class="empty-state"><div class="icon">📅</div><h4>No appointments</h4></div></td></tr>'
    : appts.map(a => `<tr>
        <td><strong>${a.QueueToken}</strong></td>
        <td>${a.PatientName}</td><td>${a.PatientPhone||'-'}</td><td>${a.Date}</td>
        <td>${a.StartTime} - ${a.EndTime}</td>
        <td><span class="badge ${a.SlotType==='Emergency'?'badge-danger':'badge-info'}">${a.SlotType}</span></td>
        <td><span class="badge ${a.Priority==='Emergency'?'badge-danger':a.Priority==='High'?'badge-warning':'badge-info'}">${a.Priority}</span></td>
        <td><span class="badge ${a.Status==='Completed'?'badge-success':a.Status==='In-Progress'?'badge-warning':a.Status==='Cancelled'?'badge-danger':'badge-primary'}">${a.Status}</span></td>
        <td>${a.Status!=='Cancelled'&&a.Status!=='Completed'?`<button class="btn btn-danger btn-sm" onclick="cancelAppointment(${a.AppointmentID})">Cancel</button>`:''}</td>
      </tr>`).join('');
}

async function showBookAppointmentModal() {
  const patients = await api('/api/patients');
  const slots = await api('/api/slots');
  const availSlots = slots.filter(s => s.Status === 'Active' && s.Booked < s.Capacity);
  showModal('Book Appointment', `
    <div class="form-group"><label>Patient *</label><select class="form-control" id="apptPatient">
      <option value="">Select Patient</option>
      ${patients.map(p => `<option value="${p.PatientID}">${p.Name} (${p.CNIC || p.Phone})</option>`).join('')}
    </select></div>
    <div class="form-group"><label>Available Slot *</label><select class="form-control" id="apptSlot">
      <option value="">Select Slot</option>
      ${availSlots.map(s => `<option value="${s.SlotID}">${s.Date} | ${s.StartTime}-${s.EndTime} [${s.SlotType}] (${s.Capacity-s.Booked} left)</option>`).join('')}
    </select></div>
    <div class="form-group"><label>Priority</label><select class="form-control" id="apptPriority"><option>Normal</option><option>High</option><option>Emergency</option></select></div>
    <div class="form-group"><label>Notes</label><textarea class="form-control" id="apptNotes" rows="2" placeholder="Optional notes..."></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="bookAppointment()">Book Now</button>`);
}

async function bookAppointment() {
  const body = {
    PatientID: parseInt(document.getElementById('apptPatient').value),
    SlotID: parseInt(document.getElementById('apptSlot').value),
    Priority: document.getElementById('apptPriority').value,
    Notes: document.getElementById('apptNotes').value
  };
  if (!body.PatientID || !body.SlotID) return toast('Select patient and slot', 'error');
  try {
    const res = await api('/api/appointments', { method: 'POST', body });
    closeModal(); toast(`Appointment booked! Token: ${res.QueueToken}`); loadAppointments();
  } catch(e) { toast(e.message, 'error'); }
}

async function cancelAppointment(id) {
  if (!confirm('Cancel this appointment?')) return;
  try { await api(`/api/appointments/${id}`, { method: 'DELETE' }); toast('Appointment cancelled'); loadAppointments(); }
  catch(e) { toast(e.message, 'error'); }
}
