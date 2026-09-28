// ─── Dashboard Page ───
async function renderDashboard() {
  const data = await api('/api/dashboard');
  const s = data.stats;
  const pc = document.getElementById('pageContent');
  pc.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card purple"><div class="stat-icon">👥</div><div class="stat-info"><h4>Total Patients</h4><div class="stat-value">${s.totalPatients}</div></div></div>
      <div class="stat-card blue"><div class="stat-icon">📅</div><div class="stat-info"><h4>Today's Appointments</h4><div class="stat-value">${s.todayAppointments}</div></div></div>
      <div class="stat-card orange"><div class="stat-icon">🧪</div><div class="stat-info"><h4>Pending Samples</h4><div class="stat-value">${s.pendingSamples}</div></div></div>
      <div class="stat-card green"><div class="stat-icon">💰</div><div class="stat-info"><h4>Today's Revenue</h4><div class="stat-value">Rs ${s.todayRevenue.toLocaleString()}</div></div></div>
      <div class="stat-card pink"><div class="stat-icon">📄</div><div class="stat-info"><h4>Pending Reports</h4><div class="stat-value">${s.pendingReports}</div></div></div>
      <div class="stat-card blue"><div class="stat-icon">🔬</div><div class="stat-info"><h4>Active Tests</h4><div class="stat-value">${s.totalTests}</div></div></div>
      <div class="stat-card orange"><div class="stat-icon">📦</div><div class="stat-info"><h4>Low Stock Alerts</h4><div class="stat-value">${s.lowStockItems}</div></div></div>
      <div class="stat-card purple"><div class="stat-icon">💳</div><div class="stat-info"><h4>Total Bills</h4><div class="stat-value">${s.totalBills}</div></div></div>
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><h3>📈 Weekly Revenue</h3></div><div class="card-body"><div class="chart-container"><canvas id="revenueChart"></canvas></div></div></div>
      <div class="card"><div class="card-header"><h3>🧬 Test Distribution</h3></div><div class="card-body"><div class="chart-container"><canvas id="testChart"></canvas></div></div></div>
    </div>
    <div style="margin-top:20px">
      <div class="card"><div class="card-header"><h3>📋 Recent Appointments</h3></div><div class="card-body">
        <div class="table-wrapper"><table><thead><tr><th>Token</th><th>Patient</th><th>Date</th><th>Time</th><th>Priority</th><th>Status</th></tr></thead>
        <tbody>${data.recentAppointments.map(a => `<tr>
          <td><strong>${a.QueueToken}</strong></td><td>${a.PatientName}</td><td>${a.Date}</td><td>${a.StartTime}</td>
          <td><span class="badge ${a.Priority==='Emergency'?'badge-danger':a.Priority==='High'?'badge-warning':'badge-info'}">${a.Priority}</span></td>
          <td><span class="badge ${a.Status==='Completed'?'badge-success':a.Status==='In-Progress'?'badge-warning':a.Status==='Cancelled'?'badge-danger':'badge-info'}">${a.Status}</span></td>
        </tr>`).join('')}</tbody></table></div></div></div>
    </div>`;

  // Revenue Chart
  const rLabels = data.weeklyRevenue.map(r => r.day);
  const rData = data.weeklyRevenue.map(r => r.revenue);
  new Chart(document.getElementById('revenueChart'), {
    type: 'line',
    data: { labels: rLabels, datasets: [{ label: 'Revenue (Rs)', data: rData, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#6366f1' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(42,48,80,0.3)' } }, y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(42,48,80,0.3)' } } } }
  });

  // Test Distribution Chart
  const tLabels = data.testDistribution.map(t => t.Category);
  const tData = data.testDistribution.map(t => t.count);
  new Chart(document.getElementById('testChart'), {
    type: 'doughnut',
    data: { labels: tLabels, datasets: [{ data: tData, backgroundColor: ['#6366f1','#06b6d4','#22c55e','#f59e0b','#ef4444','#ec4899','#8b5cf6'] }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16 } } } }
  });
}
