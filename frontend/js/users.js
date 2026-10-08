'use strict';
// ── User management (Admin only) ──────────────────────────────
let _editingUserId = null;

async function loadUsers() {
  const user = getUser();
  if (!user || user.rol !== 'Administrador') return;
  try {
    const data = await apiFetch('/users');
    renderUsersTable(data.users);
  } catch (_) {}
}

function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${escapeHtml(u.nombre)}</strong></td>
      <td><code>${escapeHtml(u.usuario)}</code></td>
      <td><span class="badge ${u.rol==='Administrador'?'badge-admin':'badge-op'}">${u.rol}</span></td>
      <td><span class="badge ${u.activo?'badge-green':'badge-red'}">${u.activo?'Activo':'Inactivo'}</span></td>
      <td>
        <div class="users-table-actions">
          <button class="btn btn-secondary btn-sm" onclick="openEditUser(${u.id},'${escapeHtml(u.nombre)}','${escapeHtml(u.usuario)}','${u.rol}')">Editar</button>
          <button class="btn btn-ghost btn-sm" onclick="openChangePassword(${u.id})">Contraseña</button>
          ${u.activo ? `<button class="btn btn-danger-ghost btn-sm" onclick="deactivateUser(${u.id})">Desactivar</button>` : ''}
        </div>
      </td>
    </tr>`).join('') || '<tr class="empty-row"><td colspan="5">No hay usuarios.</td></tr>';
}

function openCreateUser() {
  _editingUserId = null;
  document.getElementById('modalUserTitle').textContent = 'Crear Usuario';
  document.getElementById('userFormNombre').value = '';
  document.getElementById('userFormUsuario').value = '';
  document.getElementById('userFormRol').value = 'Recepcion';
  document.getElementById('userFormPassword').value = '';
  document.getElementById('userPasswordGroup').style.display = 'block';
  document.getElementById('modalUser').classList.remove('hidden');
}

function openEditUser(id, nombre, usuario, rol) {
  _editingUserId = id;
  document.getElementById('modalUserTitle').textContent = 'Editar Usuario';
  document.getElementById('userFormNombre').value = nombre;
  document.getElementById('userFormUsuario').value = usuario;
  document.getElementById('userFormRol').value = rol;
  document.getElementById('userFormPassword').value = '';
  document.getElementById('userPasswordGroup').style.display = 'none';
  document.getElementById('modalUser').classList.remove('hidden');
}

function openChangePassword(id) {
  _editingUserId = id;
  document.getElementById('pwdUserId').value = id;
  document.getElementById('newPasswordInput').value = '';
  document.getElementById('modalPassword').classList.remove('hidden');
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.getElementById('userForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    nombre:   document.getElementById('userFormNombre').value.trim(),
    usuario:  document.getElementById('userFormUsuario').value.trim(),
    rol:      document.getElementById('userFormRol').value,
    password: document.getElementById('userFormPassword').value,
  };
  setLoading(true);
  try {
    if (_editingUserId) {
      await apiFetch(`/users/${_editingUserId}`, { method:'PUT', body: JSON.stringify(payload) });
      showToast('Usuario actualizado.', 'success');
    } else {
      await apiFetch('/users', { method:'POST', body: JSON.stringify(payload) });
      showToast('Usuario creado.', 'success');
    }
    closeModal('modalUser'); loadUsers();
  } catch (err) { showToast(err.message, 'error'); } finally { setLoading(false); }
});

document.getElementById('passwordForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id  = _editingUserId;
  const pwd = document.getElementById('newPasswordInput').value;
  setLoading(true);
  try {
    await apiFetch(`/users/${id}/password`, { method:'PUT', body: JSON.stringify({ newPassword: pwd }) });
    showToast('Contraseña actualizada.', 'success');
    closeModal('modalPassword');
  } catch (err) { showToast(err.message, 'error'); } finally { setLoading(false); }
});

async function deactivateUser(id) {
    if (!(await showConfirm('¿Seguro que quieres desactivar este usuario? No podrá iniciar sesión hasta que lo reactives.', 'Desactivar'))) return;
  setLoading(true);
  try {
    await apiFetch(`/users/${id}`, { method:'DELETE' });
    showToast('Usuario desactivado.', 'success'); loadUsers();
  } catch (err) { showToast(err.message, 'error'); } finally { setLoading(false); }
}

window.loadUsers=loadUsers; window.openCreateUser=openCreateUser; window.openEditUser=openEditUser;
window.openChangePassword=openChangePassword; window.closeModal=closeModal; window.deactivateUser=deactivateUser;
