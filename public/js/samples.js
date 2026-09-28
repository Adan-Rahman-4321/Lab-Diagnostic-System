// ─── Sample Tracking Page ───
async function renderSamples() {
  const pc = document.getElementById('pageContent');
  pc.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div style="display:flex;gap:10px">
        <button class="btn btn-secondary btn-sm active" onclick="loadSamples()">All</button>
        <button class="btn btn-secondary btn-sm" onclick="loadSamples('Collected')">Collected</button>
        <button class="btn btn-secondary btn-sm" onclick="loadSamples('Processing')">Processing</button>
        <button class="btn btn-secondary btn-sm" onclick="loadSamples('Analyzed')">Analyzed</button>
        <button class="btn btn-secondary btn-sm" onclick="loadSamples('Verified')">Verified</button>
      </div>
      <button class="btn btn-primary" onclick="showCollectSampleModal()">+ Collect Sample</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-wrapper"><table>
      <thead><tr><th>Barcode</th><th>Patient</th><th>Type</th><th>Technician</th><th>Status</th><th>Collected</th><th>Actions</th></tr></thead>
      <tbody id="samplesTable"><tr><td colspan="7"><div class="spinner"></div></td></tr></tbody>
    </table></div></div></div>`;
  loadSamples();
}

async function loadSamples(status = '') {
  const samples = await api(`/api/samples${status ? '?status=' + status : ''}`);
  const statusColors = { Collected: 'badge-info', Processing: 'badge-warning', Analyzed: 'badge-primary', Verified: 'badge-success', Rejected: 'badge-danger' };
  document.getElementById('samplesTable').innerHTML = samples.length === 0
    ? '<tr><td colspan="7"><div class="empty-state"><div class="icon">🧪</div><h4>No samples found</h4></div></td></tr>'
    : samples.map(s => `<tr>
        <td><strong style="font-family:monospace">${s.Barcode}</strong></td>
        <td>${s.PatientName}</td><td>${s.SampleType}</td><td>${s.TechnicianName||'Unassigned'}</td>
        <td><span class="badge ${statusColors[s.Status]||'badge-secondary'}">${s.Status}</span></td>
        <td>${new Date(s.CollectedAt).toLocaleDateString()}</td>
        <td>
          ${s.Status==='Collected'?`<button class="btn btn-warning btn-sm" onclick="updateSampleStatus(${s.SampleID},'Processing')">Process</button>`:''}
          ${s.Status==='Processing'?`<button class="btn btn-primary btn-sm" onclick="showEnterResultsModal(${s.SampleID})">Enter Results</button>`:''}
          ${s.Status==='Analyzed'?'<span class="badge badge-info">Awaiting Verify</span>':''}
          <button class="btn btn-secondary btn-sm" onclick="viewSampleTimeline(${s.SampleID},'${s.Status}','${s.Barcode}')">📋</button>
        </td></tr>`).join('');
}

async function showCollectSampleModal() {
  const patients = await api('/api/patients');
  const tests = await api('/api/samples/tests');
  showModal('Collect New Sample', `
    <div class="form-group"><label>Patient *</label><select class="form-control" id="smPatient">
      <option value="">Select Patient</option>
      ${patients.map(p=>`<option value="${p.PatientID}">${p.Name} (${p.Phone})</option>`).join('')}
    </select></div>
    <div class="form-group"><label>Sample Type *</label><select class="form-control" id="smType">
      <option>Blood</option><option>Urine</option><option>Serum</option><option>Plasma</option><option>Swab</option><option>Stool</option><option>Other</option>
    </select></div>
    <div class="form-group"><label>Tests *</label><div style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:10px" id="testCheckboxes">
      ${tests.map(t=>`<label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;color:var(--text-secondary);font-size:0.85rem">
        <input type="checkbox" value="${t.TestID}" class="smTest"> ${t.TestName} <span style="margin-left:auto;color:var(--text-muted)">Rs ${t.Price}</span>
      </label>`).join('')}
    </div></div>
    <div class="form-group"><label>Notes</label><textarea class="form-control" id="smNotes" rows="2"></textarea></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="collectSample()">Collect & Generate Barcode</button>`);
}

async function collectSample() {
  const testEls = document.querySelectorAll('.smTest:checked');
  const TestIDs = Array.from(testEls).map(e => parseInt(e.value));
  const body = {
    PatientID: parseInt(document.getElementById('smPatient').value),
    SampleType: document.getElementById('smType').value,
    TestIDs, Notes: document.getElementById('smNotes').value
  };
  if (!body.PatientID || TestIDs.length === 0) return toast('Select patient and at least one test', 'error');
  try {
    const res = await api('/api/samples', { method: 'POST', body });
    closeModal(); toast(`Sample collected! Barcode: ${res.Barcode}`); loadSamples();
  } catch(e) { toast(e.message, 'error'); }
}

async function updateSampleStatus(id, status) {
  try { await api(`/api/samples/${id}`, { method: 'PUT', body: { Status: status } }); toast('Status updated'); loadSamples(); }
  catch(e) { toast(e.message, 'error'); }
}

async function showEnterResultsModal(sampleId) {
  const results = await api(`/api/samples/${sampleId}/results`);
  showModal('Enter Test Results', `
    <div id="resultFields">${results.map(r => `
      <div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <strong style="color:var(--text-primary)">${r.TestName}</strong>
          <span style="color:var(--text-muted);font-size:0.8rem">Ref: ${r.ReferenceRange} ${r.Unit}</span>
        </div>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:0"><input class="form-control" id="rv_${r.ResultID}" placeholder="Result value" value="${r.ResultValue||''}"></div>
          <div class="form-group" style="margin-bottom:0"><input class="form-control" id="rm_${r.ResultID}" placeholder="Remarks" value="${r.Remarks||''}"></div>
        </div>
        <label style="display:flex;align-items:center;gap:6px;margin-top:6px;color:var(--danger);font-size:0.8rem;cursor:pointer">
          <input type="checkbox" id="ab_${r.ResultID}" ${r.IsAbnormal?'checked':''}> Mark as Abnormal
        </label>
      </div>`).join('')}
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="saveResults(${sampleId}, [${results.map(r=>r.ResultID).join(',')}])">Save & Mark Analyzed</button>`);
}

async function saveResults(sampleId, resultIds) {
  try {
    for (const rid of resultIds) {
      await api(`/api/samples/${sampleId}/results/${rid}`, { method: 'PUT', body: {
        ResultValue: document.getElementById(`rv_${rid}`).value,
        Remarks: document.getElementById(`rm_${rid}`).value,
        IsAbnormal: document.getElementById(`ab_${rid}`).checked
      }});
    }
    await api(`/api/samples/${sampleId}`, { method: 'PUT', body: { Status: 'Analyzed' } });
    closeModal(); toast('Results saved!'); loadSamples();
  } catch(e) { toast(e.message, 'error'); }
}

function viewSampleTimeline(id, status, barcode) {
  const steps = ['Collected','Processing','Analyzed','Verified'];
  const idx = steps.indexOf(status);
  showModal(`Sample Timeline - ${barcode}`, `
    <div class="timeline">${steps.map((s, i) => `
      <div class="timeline-step ${i<idx?'completed':i===idx?'active':''}">
        <div class="timeline-dot">${i<idx?'✓':i===idx?'●':i+1}</div>
        <div class="timeline-label">${s}</div>
      </div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:20px;color:var(--text-secondary)">Current Status: <span class="badge badge-primary">${status}</span></div>`);
}
