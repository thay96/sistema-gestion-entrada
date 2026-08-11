'use strict';

const pages    = document.querySelectorAll('.page');
const navItems = document.querySelectorAll('.nav-item');

// ── Login ────────────────────────────────────────────────
const loginPage    = document.getElementById('loginPage');
const appContainer = document.getElementById('appContainer');
const loginForm    = document.getElementById('loginForm');
const loginError   = document.getElementById('loginError');
const loginBtn     = document.getElementById('btnLogin');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.remove('show');
  const usuario  = document.getElementById('loginUsuario').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!usuario || !password) { showLoginError('Complete todos los campos.'); return; }
  loginBtn.disabled = true;
  loginBtn.textContent = 'Iniciando sesión...';
  try {
    const data = await apiFetch('/auth/login', { method:'POST', body: JSON.stringify({ usuario, password }) });
    setToken(data.token);
    setUser(data.user);
    initApp(data.user);
  } catch (err) {
    showLoginError(err.message || 'Credenciales incorrectas.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>Iniciar Sesión';
  }
});

function showLoginError(msg) {
  loginError.querySelector('span').textContent = msg;
  loginError.classList.add('show');
}

// ── Navigation ───────────────────────────────────────────
function navigateTo(pageId) {
  pages.forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${pageId}`);
  if (target) target.classList.add('active');
  navItems.forEach(item => item.classList.toggle('active', item.dataset.page === pageId));

  switch (pageId) {
    case 'dashboard':      loadDashboard(); startDashboardAutoRefresh(); stopEntryFormClock(); break;
    case 'register-entry': stopDashboardAutoRefresh(); startEntryFormClock(); setTimeout(() => document.getElementById('entryDocumento').focus(), 80); break;
    case 'register-exit':  stopDashboardAutoRefresh(); stopEntryFormClock(); resetExitPage(); setTimeout(() => document.getElementById('exitSearchInput').focus(), 80); break;
    case 'history':        stopDashboardAutoRefresh(); stopEntryFormClock(); loadHistory(); break;
    case 'settings':       stopDashboardAutoRefresh(); stopEntryFormClock(); loadUsers(); break;
  }
}

navItems.forEach(item => item.addEventListener('click', e => { e.preventDefault(); navigateTo(item.dataset.page); }));
document.getElementById('btnLogout').addEventListener('click', () => { stopDashboardAutoRefresh(); stopEntryFormClock(); logout(); });

// ── Role-based menu ──────────────────────────────────────
function applyRoleMenu(user) {
  const adminOnly = document.querySelectorAll('[data-role="admin"]');
  if (user.rol === 'Administrador') {
    adminOnly.forEach(el => el.style.display = '');
    navigateTo('dashboard');
  } else {
    adminOnly.forEach(el => el.style.display = 'none');
    navigateTo('register-entry');
  }
  // User info in sidebar
  const name = user.nombre || user.usuario;
  document.getElementById('sidebarUserName').textContent = name;
  document.getElementById('sidebarUserRole').textContent = user.rol;
  document.getElementById('sidebarAvatar').textContent   = name.charAt(0).toUpperCase();
}

// ── App init ─────────────────────────────────────────────
function initApp(user) {
  loginPage.style.display    = 'none';
  appContainer.style.display = 'block';
  startClock();
  applyRoleMenu(user);
}

// ── Auto-login from saved token ──────────────────────────
(function bootstrap() {
  const token = localStorage.getItem('coneq_token');
  const user  = getUser();
  if (token && user) {
    initApp(user);
  } else {
    loginPage.style.display = 'flex';
  }
})();
