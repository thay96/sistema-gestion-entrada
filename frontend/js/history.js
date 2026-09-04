'use strict';

/* ─────────────────────────────────────────────────────────
   history.js — Lógica del Historial
───────────────────────────────────────────────────────── */

const historySearch = document.getElementById('historySearch');
const historyDateFrom = document.getElementById('historyDateFrom');
const historyDateTo = document.getElementById('historyDateTo');
const btnHistSearch = document.getElementById('btnHistorySearch');
const btnHistClear = document.getElementById('btnHistoryClear');
const btnExportExcel = document.getElementById('btnExportExcel');
const historyTbody = document.getElementById('historyTableBody');
const historyCount = document.getElementById('historyCount');

/**
 * Obtiene el historial aplicando los filtros actuales.
 */
async function loadHistory() {
  const q = historySearch.value.trim();
  const fechaDesde = historyDateFrom.value;
  const fechaHasta = historyDateTo.value;

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (fechaDesde) params.set('fechaDesde', fechaDesde);
  if (fechaHasta) params.set('fechaHasta', fechaHasta);

  setLoading(true);
  try {
    const data = await apiFetch(`/entries/history?${params.toString()}`);
    renderHistoryTable(data.records);
  } catch (err) {
    showToast(err.message || 'Error al cargar el historial.', 'error');
  } finally {
    setLoading(false);
  }

  try {
    const dashData = await apiFetch('/dashboard');
    if (dashData.horasPico) renderPeakHoursChart(dashData.horasPico, 'peakHoursChartHistory');
  } catch (_) {
    // Si falla, simplemente no se dibuja la gráfica, sin interrumpir el resto del historial
  }
}
/**
 * Renderiza la tabla de historial.
 */
function renderHistoryTable(records) {
  historyCount.textContent = `${records.length} registro${records.length !== 1 ? 's' : ''}`;

  const user = getUser();
  const isAdmin = user && user.rol === 'Administrador';
  const colspan = isAdmin ? 9 : 8;

  if (!records.length) {
    historyTbody.innerHTML = `<tr class="empty-row"><td colspan="${colspan}">No se encontraron registros.</td></tr>`;
    return;
  }

  historyTbody.innerHTML = records.map((r) => {
    const inside = r.estado === 'Dentro';
    const statusHtml = inside
      ? `<span class="status-dot inside">Dentro</span>`
      : `<span class="status-dot outside">Salió</span>`;
    const tipoClass = r.tipo_persona.toLowerCase();

    const deleteBtn = isAdmin
      ? `<button class="btn btn-danger-ghost btn-sm btn-delete-history" data-id="${r.id}">Eliminar</button>`
      : '';

      const fotoHtml = r.foto
      ? `<img src="/uploads/fotos/${r.foto}" class="history-photo-thumb" data-full="/uploads/fotos/${r.foto}" style="width:38px;height:38px;object-fit:cover;border-radius:6px;cursor:pointer;">`
      : `<span style="color:var(--text-muted);font-size:.78rem;">Sin foto</span>`;

    return `
      <tr>
        <td>${statusHtml}</td>
        <td><code>${escapeHtml(r.documento)}</code></td>
        <td><strong>${escapeHtml(r.nombre)}</strong></td>
        <td>${escapeHtml(r.empresa)}</td>
        <td><span class="tipo-chip ${tipoClass}">${r.tipo_persona}</span></td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
            title="${r.motivo ? escapeHtml(r.motivo) : ''}">
          ${r.motivo ? escapeHtml(r.motivo) : '<span style="color:var(--text-muted)">—</span>'}
        </td>
        <td>${fotoHtml}</td>
        <td style="white-space:nowrap;">${formatDateTime(r.hora_entrada)}</td>
        <td style="white-space:nowrap;">${r.hora_salida ? formatDateTime(r.hora_salida) : '<span style="color:var(--text-muted)">—</span>'}</td>
        ${isAdmin ? `<td>${deleteBtn}</td>` : ''}
      </tr>`;
  }).join('');

  if (isAdmin) {
    historyTbody.querySelectorAll('.btn-delete-history').forEach(btn => {
      btn.addEventListener('click', () => handleDeleteHistory(btn));
    });
  }

  historyTbody.querySelectorAll('.history-photo-thumb').forEach(img => {
    img.addEventListener('click', () => showPhotoModal(img.dataset.full));
  });
}

/**
 * Muestra la foto de un visitante en tamaño completo, en una ventana simple.
 */
function showPhotoModal(url) {
  window.open(url, '_blank', 'width=500,height=600');
}

/**
 * Elimina un registro del historial (solo Administrador).
 */
async function handleDeleteHistory(btn) {
  const id = btn.dataset.id;
  const confirmado = confirm('¿Seguro que quieres eliminar este registro del historial? Esta acción no se puede deshacer.');
  if (!confirmado) return;

  btn.disabled = true;
  btn.textContent = 'Eliminando...';
  setLoading(true);
  try {
    await apiFetch(`/entries/${id}`, { method: 'DELETE' });
    showToast('Registro eliminado correctamente.', 'success');
    const row = btn.closest('tr');
    row.style.transition = 'opacity .3s';
    row.style.opacity = '0';
    setTimeout(() => row.remove(), 300);
  } catch (err) {
    showToast(err.message || 'Error al eliminar el registro.', 'error');
    btn.disabled = false;
    btn.textContent = 'Eliminar';
  } finally {
    setLoading(false);
  }
}

/**
 * Descarga el historial como archivo Excel.
 */
async function exportToExcel() {
  const q = historySearch.value.trim();
  const fechaDesde = historyDateFrom.value;
  const fechaHasta = historyDateTo.value;

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (fechaDesde) params.set('fechaDesde', fechaDesde);
  if (fechaHasta) params.set('fechaHasta', fechaHasta);

  showToast('Generando archivo Excel...', 'info');
  setLoading(true);
  try {
    const token = localStorage.getItem('coneq_token');
    const res = await fetch(`/api/entries/export?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Error al generar el archivo Excel.');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    showToast('Archivo descargado correctamente.', 'success');
  } catch (err) {
    showToast(err.message || 'Error al exportar.', 'error');
  } finally {
    setLoading(false);
  }
}

/**
 * Limpia los filtros y recarga el historial.
 */
function clearHistoryFilters() {
  historySearch.value = '';
  historyDateFrom.value = '';
  historyDateTo.value = '';
  loadHistory();
}

// Eventos
btnHistSearch.addEventListener('click', loadHistory);
btnHistClear.addEventListener('click', clearHistoryFilters);
btnExportExcel.addEventListener('click', exportToExcel);

historySearch.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadHistory();
});

// Exponer
const btnEvacuation = document.getElementById('btnEvacuation');

/**
 * Genera y muestra la lista de evacuación (quiénes están dentro ahora mismo).
 * La lista queda "congelada" en el momento del clic: no se actualiza sola después.
 */
async function showEvacuationList() {
  setLoading(true);
  try {
    const data = await apiFetch('/entries/evacuation');
    renderEvacuationModal(data.records, data.generatedAt);
  } catch (err) {
    showToast(err.message || 'Error al generar la lista de evacuación.', 'error');
  } finally {
    setLoading(false);
  }
}

function renderEvacuationModal(records, generatedAt) {
  const timestampEl = document.getElementById('evacuationTimestamp');
  const tbody       = document.getElementById('evacuationTableBody');

  const fecha = new Date(generatedAt);
  const fechaTexto = fecha.toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  timestampEl.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    <span><strong>${records.length}</strong> persona${records.length !== 1 ? 's' : ''} dentro al momento de generar esta lista — <strong>${fechaTexto}</strong></span>
  `;

  if (!records.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No hay nadie registrado como "Dentro" en este momento.</td></tr>`;
  } else {
    tbody.innerHTML = records.map(r => `
      <tr>
        <td><code>${escapeHtml(r.documento)}</code></td>
        <td><strong>${escapeHtml(r.nombre)}</strong></td>
        <td>${escapeHtml(r.empresa)}</td>
        <td style="white-space:nowrap;">${formatTime(r.hora_entrada)}</td>
      </tr>`).join('');
  }

  document.getElementById('modalEvacuation').classList.remove('hidden');
}

btnEvacuation.addEventListener('click', showEvacuationList);

window.loadHistory = loadHistory;
