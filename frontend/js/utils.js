'use strict';
const API_BASE = '/api';
let _authToken = localStorage.getItem('coneq_token') || null;

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (res.headers.get('content-type')?.includes('application/json')) {
    const data = await res.json();
    if (res.status === 401) {
      const msg = data.message || 'No autorizado.';
      // Solo cerrar sesión si NO es la petición de login
      if (!path.includes('/auth/login')) logout();
      throw new Error(msg);
    }
    if (!res.ok || !data.success) throw new Error(data.message || `Error ${res.status}`);
    return data;
  }
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res;
}

function setToken(token) { _authToken = token; localStorage.setItem('coneq_token', token); }
function getUser()  { const u = localStorage.getItem('coneq_user'); return u ? JSON.parse(u) : null; }
function setUser(u) { localStorage.setItem('coneq_user', JSON.stringify(u)); }
function logout()   {
  _authToken = null;
  localStorage.removeItem('coneq_token');
  localStorage.removeItem('coneq_user');
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('loginPage').style.display    = 'flex';
}

function showToast(message, type = 'info', duration = 3500) {
  const icons = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `${icons[type]}<span>${message}</span>`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => { t.classList.add('hide'); t.addEventListener('animationend', () => t.remove()); }, duration);
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
}
function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
}
function setLoading(v) { document.getElementById('loadingOverlay').style.display = v ? 'flex' : 'none'; }
function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function startClock() {
  const te = document.getElementById('clockTime'), de = document.getElementById('clockDate');
  function tick() {
    const n = new Date();
    te.textContent = n.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
    de.textContent = n.toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'short'});
  }
  tick(); setInterval(tick, 1000);
}

window.apiFetch=apiFetch; window.setToken=setToken; window.getUser=getUser; window.setUser=setUser;
window.logout=logout; window.showToast=showToast; window.formatDateTime=formatDateTime;
window.formatTime=formatTime; window.setLoading=setLoading; window.escapeHtml=escapeHtml; window.startClock=startClock;
