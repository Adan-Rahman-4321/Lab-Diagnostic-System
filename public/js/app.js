// ─── Smart Diagnostic Lab SPA Router ───
let currentUser = null;
let currentPage = '';

// API helper
async function api(url, options = {}) {
  const opts = { headers: { 'Content-Type': 'application/json' }, ...options };
  if (opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
  const res = await fetch(url, opts);
  if (res.status === 401) { currentUser = null; renderLogin(); throw new Error('Unauthorized'); }
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : res;
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function toast(message, type = 'success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `${type === 'success' ? '✓' : '✕'} ${message}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function showModal(title, bodyHtml, footerHtml = '') {
  const o = document.getElementById('modalOverlay');
  document.getElementById('modalContent').innerHTML = `
    <div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-body">${bodyHtml}</div>
    ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}`;
  o.classList.add('active');
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('active'); }
document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

// ─── NAV CONFIG ───
const navItems = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard', roles: ['Admin','Receptionist','Technician','Doctor','Patient'], section: 'Main' },
  { id: 'patients', icon: '👥', label: 'Patients', roles: ['Admin','Receptionist'], section: 'Main' },
  { id: 'slots', icon: '🕐', label: 'Manage Slots', roles: ['Admin','Receptionist'], section: 'Appointments' },
  { id: 'appointments', icon: '📅', label: 'Book Appointment', roles: ['Admin','Receptionist','Patient'], section: 'Appointments' },
  { id: 'queue', icon: '📋', label: 'Queue Management', roles: ['Admin','Receptionist','Technician'], section: 'Appointments' },
  { id: 'samples', icon: '🧪', label: 'Sample Tracking', roles: ['Admin','Technician'], section: 'Lab' },
  { id: 'reports', icon: '📄', label: 'Reports & Verify', roles: ['Admin','Doctor','Technician'], section: 'Lab' },
  { id: 'tests', icon: '🔬', label: 'Manage Tests', roles: ['Admin'], section: 'Lab' },
  { id: 'billing', icon: '💳', label: 'Billing', roles: ['Admin','Receptionist'], section: 'Finance' },
  { id: 'inventory', icon: '📦', label: 'Inventory', roles: ['Admin'], section: 'Finance' },
];

function renderLayout(pageContent, activeId) {
  const sections = {};
  navItems.filter(n => n.roles.includes(currentUser.Role)).forEach(n => {
    if (!sections[n.section]) sections[n.section] = [];
    sections[n.section].push(n);
  });
  let navHtml = '';
  Object.entries(sections).forEach(([sec, items]) => {
    navHtml += `<div class="nav-section-title">${sec}</div>`;
    items.forEach(n => {
      navHtml += `<div class="nav-item ${n.id === activeId ? 'active' : ''}" onclick="navigate('${n.id}')">
        <span class="nav-icon">${n.icon}</span>${n.label}</div>`;
    });
  });
  const initials = currentUser.Name.split(' ').map(w => w[0]).join('').substring(0, 2);
  document.getElementById('app').innerHTML = `
  <div class="app-layout">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="brand-icon">🔬</div>
        <div class="brand-text"><h2>DiagnoLab</h2><span>Management System</span></div>
      </div>
      <nav class="sidebar-nav">${navHtml}</nav>
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">${initials}</div>
          <div class="user-details">
            <div class="user-name">${currentUser.Name}</div>
            <div class="user-role">${currentUser.Role}</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm btn-block" style="margin-top:10px" onclick="logout()">🚪 Logout</button>
      </div>
    </aside>
    <main class="main-content">
      <header class="top-bar">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('sidebar').classList.toggle('open')" style="display:none" id="menuBtn">☰</button>
          <span class="page-title" id="pageTitle"></span>
        </div>
        <div class="top-actions">
          <span style="color:var(--text-muted);font-size:0.8rem">${new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</span>
        </div>
      </header>
      <div class="page-content" id="pageContent"><div class="spinner"></div></div>
    </main>
  </div>`;
  if (window.innerWidth <= 768) document.getElementById('menuBtn').style.display = 'block';
}

// ─── ROUTING ───
async function navigate(page) {
  currentPage = page;
  renderLayout('', page);
  const titles = { dashboard:'Dashboard', patients:'Patient Management', slots:'Slot Management', appointments:'Appointment Booking', queue:'Queue Management', samples:'Sample Tracking', reports:'Reports & Verification', tests:'Manage Tests', billing:'Billing', inventory:'Inventory Management' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  try {
    switch(page) {
      case 'dashboard': await renderDashboard(); break;
      case 'patients': await renderPatients(); break;
      case 'slots': await renderSlots(); break;
      case 'appointments': await renderAppointments(); break;
      case 'queue': await renderQueue(); break;
      case 'samples': await renderSamples(); break;
      case 'reports': await renderReports(); break;
      case 'tests': await renderTests(); break;
      case 'billing': await renderBilling(); break;
      case 'inventory': await renderInventory(); break;
    }
  } catch(e) { document.getElementById('pageContent').innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`; }
}

// ─── AUTH ───
function renderLogin() {
  document.getElementById('app').innerHTML = `
  <div class="login-wrapper">
    <div class="login-card">
      <div class="logo">
        <div class="icon">🔬</div>
        <h1>DiagnoLab System</h1>
        <p>Smart Diagnostic Lab & Slot Management</p>
      </div>
      <form onsubmit="handleLogin(event)">
        <div class="form-group"><label>Email Address</label><input class="form-control" id="loginEmail" type="email" placeholder="admin@lab.com" required></div>
        <div class="form-group"><label>Password</label><input class="form-control" id="loginPass" type="password" placeholder="••••••••" required></div>
        <div id="loginError" class="alert alert-danger" style="display:none"></div>
        <button class="btn btn-primary btn-lg btn-block" type="submit" id="loginBtn">Sign In</button>
      </form>
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border)">
        <p style="color:var(--text-muted);font-size:0.75rem;text-align:center;margin-bottom:10px">Demo Accounts</p>
        <div style="display:grid;gap:6px;font-size:0.75rem;color:var(--text-secondary)">
          <div style="display:flex;justify-content:space-between"><span>👑 Admin</span><span>admin@lab.com / admin123</span></div>
          <div style="display:flex;justify-content:space-between"><span>💁 Receptionist</span><span>receptionist@lab.com / rec123</span></div>
          <div style="display:flex;justify-content:space-between"><span>🔧 Technician</span><span>tech@lab.com / tech123</span></div>
          <div style="display:flex;justify-content:space-between"><span>🩺 Doctor</span><span>doctor@lab.com / doc123</span></div>
          <div style="display:flex;justify-content:space-between"><span>🧑 Patient</span><span>patient@lab.com / pat123</span></div>
        </div>
      </div>
    </div>
  </div>`;
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = 'Signing in...';
  try {
    const data = await api('/api/auth/login', { method: 'POST', body: { email: document.getElementById('loginEmail').value, password: document.getElementById('loginPass').value }});
    currentUser = data.user;
    navigate('dashboard');
  } catch(err) {
    const el = document.getElementById('loginError');
    el.style.display = 'flex'; el.textContent = err.message;
    btn.disabled = false; btn.textContent = 'Sign In';
  }
}

async function logout() {
  await api('/api/auth/logout', { method: 'POST' });
  currentUser = null; renderLogin();
}

// ─── INIT ───
async function init() {
  try {
    const data = await api('/api/auth/me');
    currentUser = data.user;
    navigate('dashboard');
  } catch { renderLogin(); }
}
init();
