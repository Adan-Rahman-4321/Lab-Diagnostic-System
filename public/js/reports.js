// ─── Reports & Verification Page ───
async function renderReports() {
  const pc = document.getElementById('pageContent');
  pc.innerHTML = `
    <div style="margin-bottom:20px">
      <div class="alert alert-info">🩺 Doctors can verify analyzed reports. Verified reports can be downloaded as PDF with QR verification.</div>
    </div>
    <div class="card"><div class="card-header"><h3>📄 Lab Reports</h3></div><div class="card-body"><div class="table-wrapper"><table>
      <thead><tr><th>Barcode</th><th>Patient</th><th>Age/Gender</th><th>Technician</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="reportsTable"><tr><td colspan="7"><div class="spinner"></div></td></tr></tbody>
    </table></div></div></div>`;
  loadReports();
}

async function loadReports() {
  const reports = await api('/api/reports');
  document.getElementById('reportsTable').innerHTML = reports.length === 0
    ? '<tr><td colspan="7"><div class="empty-state"><div class="icon">📄</div><h4>No reports available</h4></div></td></tr>'
    : reports.map(r => `<tr>
        <td><strong style="font-family:monospace">${r.Barcode}</strong></td>
        <td>${r.PatientName}</td><td>${r.Age||'-'} / ${r.Gender||'-'}</td>
        <td>${r.TechnicianName||'-'}</td><td>${new Date(r.CollectedAt).toLocaleDateString()}</td>
        <td><span class="badge ${r.SampleStatus==='Verified'?'badge-success':'badge-warning'}">${r.SampleStatus}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="viewReportResults(${r.SampleID})">👁 View</button>
          ${r.SampleStatus==='Analyzed' && currentUser.Role==='Doctor' ? `<button class="btn btn-success btn-sm" onclick="verifyReport(${r.SampleID})">✓ Verify</button>` : ''}
          ${r.SampleStatus==='Verified' ? `<a class="btn btn-primary btn-sm" href="/api/reports/${r.SampleID}/pdf" target="_blank">📥 PDF</a>
          <button class="btn btn-info btn-sm" onclick="shareReport(${r.SampleID}, '${r.Barcode}', '${r.PatientName}')">📲 Share</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="showQR(${r.SampleID})">QR</button>
        </td></tr>`).join('');
}

async function viewReportResults(sampleId) {
  const results = await api(`/api/samples/${sampleId}/results`);
  showModal('Test Results', `
    <div class="table-wrapper"><table>
      <thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference</th><th>Flag</th></tr></thead>
      <tbody>${results.map(r => `<tr style="${r.IsAbnormal?'color:var(--danger)':''}">
        <td>${r.TestName}</td><td><strong>${r.ResultValue||'-'}</strong></td><td>${r.Unit||'-'}</td>
        <td>${r.ReferenceRange||'-'}</td>
        <td>${r.IsAbnormal?'<span class="badge badge-danger">⚠ Abnormal</span>':'<span class="badge badge-success">Normal</span>'}</td>
      </tr>`).join('')}</tbody>
    </table></div>`);
}

async function verifyReport(sampleId) {
  if (!confirm('Verify and approve this report?')) return;
  try { await api(`/api/reports/${sampleId}/verify`, { method: 'PUT' }); toast('Report verified!'); loadReports(); }
  catch(e) { toast(e.message, 'error'); }
}

async function showQR(sampleId) {
  const data = await api(`/api/reports/${sampleId}/qr`);
  showModal('QR Verification Code', `<div style="text-align:center"><img src="${data.qr}" style="width:200px;border-radius:8px"><p style="margin-top:12px;color:var(--text-muted);font-size:0.85rem">Scan to verify report authenticity</p></div>`);
}

function shareReport(sampleId, barcode, patientName) {
  const reportUrl = `${window.location.origin}/api/reports/${sampleId}/pdf`;
  const text = encodeURIComponent(`Hello ${patientName},\n\nYour diagnostic test report (${barcode}) is ready. You can download and view it here:\n${reportUrl}\n\nThank you,\nSmart Diagnostic Lab`);
  
  showModal('Share Report', `
    <div style="display:flex;flex-direction:column;gap:15px;text-align:center">
      <a href="https://wa.me/?text=${text}" target="_blank" class="btn btn-success" style="justify-content:center;padding:12px;font-size:1rem;background:#25D366">
        <span style="font-size:1.2rem">💬</span> Share via WhatsApp
      </a>
      <a href="mailto:?subject=Your Lab Report - ${barcode}&body=${text}" target="_blank" class="btn btn-primary" style="justify-content:center;padding:12px;font-size:1rem">
        <span style="font-size:1.2rem">📧</span> Share via Email
      </a>
      <div style="margin-top:10px">
        <input class="form-control" type="text" value="${reportUrl}" id="copyLinkInput" readonly>
        <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="navigator.clipboard.writeText(document.getElementById('copyLinkInput').value); toast('Link copied!')">Copy Link</button>
      </div>
    </div>
  `);
}
