// ─── Queue Management Page ───
async function renderQueue() {
  const today = new Date().toISOString().split('T')[0];
  const pc = document.getElementById('pageContent');
  pc.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div style="display:flex;gap:12px;align-items:center">
        <label style="color:var(--text-secondary);font-size:0.85rem">Date:</label>
        <input class="form-control" type="date" id="queueDate" value="${today}" onchange="loadQueue()" style="width:200px">
      </div>
      <button class="btn btn-secondary" onclick="loadQueue()">🔄 Refresh</button>
    </div>
    <div class="stats-grid" id="queueStats"></div>
    <div class="card"><div class="card-header"><h3>📋 Live Queue</h3><span style="color:var(--text-muted);font-size:0.8rem">Priority: Emergency → High → Normal</span></div>
    <div class="card-body" style="padding:0" id="queueList"><div class="spinner"></div></div></div>`;
  loadQueue();
}

async function loadQueue() {
  const date = document.getElementById('queueDate').value;
  const [queue, stats] = await Promise.all([api(`/api/queue?date=${date}`), api(`/api/queue/stats?date=${date}`)]);

  document.getElementById('queueStats').innerHTML = `
    <div class="stat-card blue"><div class="stat-icon">📋</div><div class="stat-info"><h4>Total</h4><div class="stat-value">${stats.Total}</div></div></div>
    <div class="stat-card orange"><div class="stat-icon">⏳</div><div class="stat-info"><h4>Waiting</h4><div class="stat-value">${stats.Waiting}</div></div></div>
    <div class="stat-card purple"><div class="stat-icon">🔄</div><div class="stat-info"><h4>In Progress</h4><div class="stat-value">${stats.InProgress}</div></div></div>
    <div class="stat-card green"><div class="stat-icon">✅</div><div class="stat-info"><h4>Completed</h4><div class="stat-value">${stats.Completed}</div></div></div>`;

  document.getElementById('queueList').innerHTML = queue.length === 0
    ? '<div class="empty-state"><div class="icon">📋</div><h4>No patients in queue</h4></div>'
    : queue.map(q => `
      <div class="queue-item ${q.Priority.toLowerCase()}">
        <div class="queue-token">#${q.Position}</div>
        <div class="queue-info">
          <div class="name">${q.PatientName}</div>
          <div class="meta">Token: ${q.QueueToken} · ${q.StartTime}-${q.EndTime} · <span class="badge ${q.Priority==='Emergency'?'badge-danger':q.Priority==='High'?'badge-warning':'badge-info'}">${q.Priority}</span></div>
        </div>
        <div class="queue-wait">
          <div class="time">${q.EstimatedWait}</div>
          <div class="label">Est. Wait</div>
        </div>
        <div style="display:flex;gap:6px">
          ${q.Status==='Scheduled'?`<button class="btn btn-warning btn-sm" onclick="updateQueueStatus(${q.AppointmentID},'In-Progress')">▶ Start</button>`:''}
          ${q.Status==='In-Progress'?`<button class="btn btn-success btn-sm" onclick="updateQueueStatus(${q.AppointmentID},'Completed')">✓ Done</button>`:''}
          ${q.Status==='Completed'?'<span class="badge badge-success">Done</span>':''}
        </div>
      </div>`).join('');
}

async function updateQueueStatus(id, status) {
  try { await api(`/api/queue/${id}/status`, { method: 'PUT', body: { Status: status } }); toast('Queue updated'); loadQueue(); }
  catch(e) { toast(e.message, 'error'); }
}
