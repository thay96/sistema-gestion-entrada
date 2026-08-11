'use strict';

/* ─────────────────────────────────────────────────────────
   history.js — Lógica del Historial
───────────────────────────────────────────────────────── */

const historySearch   = document.getElementById('historySearch');
const historyDateFrom = document.getElementById('historyDateFrom');
const historyDateTo   = document.getElementById('historyDateTo');
const btnHistSearch   = document.getElementById('btnHistorySearch');
const btnHistClear    = document.getElementById('btnHistoryClear');
const btnExportExcel  = document.getElementById('btnExportExcel');
const historyTbody    = document.getElementById('historyTableBody');
const historyCount    = document.getElementById('historyCount');

/**
 * Obtiene el historial aplicando los filtros actuales.
 */
async function loadHistory() {
  const q          = historySearch.value.trim();
  const fechaDesde = historyDateFrom.value;
  const fechaHasta = historyDateTo.value;

  const params = new URLSearchParams();
  if (q)          params.set('q', q);
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
}

/**
 * Renderiza la tabla de historial.
 */
function renderHistoryTable(records) {
  historyCount.textContent = `${records.length} registro${records.length !== 1 ? 's' : ''}`;

  if (!records.length) {
    historyTbody.innerHTML = `<tr class="empty-row"><td colspan="9">No se encontraron registros.</td></tr>`;
    return;
  }

  historyTbody.innerHTML = records.map((r) => {
    const inside   = r.estado === 'Dentro';
    const statusHtml = inside
      ? `<span class="status-dot inside">Dentro</span>`
      : `<span class="status-dot outside">Salió</span>`;
    const tipoClass = r.tipo_persona.toLowerCase();

    return `
      <tr>
        <td>${statusHtml}</td>
        <td><code>${escapeHtml(r.documento)}</code></td>
        <td><strong>${escapeHtml(r.nombre)}</strong></td>
        <td>${escapeHtml(r.empresa)}</td>
        <td><span class="tipo-chip ${tipoClass}">${r.tipo_persona}</span></td>
        <td>${r.persona_visita ? escapeHtml(r.persona_visita) : '<span style="color:var(--text-muted)">—</span>'}</td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
            title="${r.motivo ? escapeHtml(r.motivo) : ''}">
          ${r.motivo ? escapeHtml(r.motivo) : '<span style="color:var(--text-muted)">—</span>'}
        </td>
        <td style="white-space:nowrap;">${formatDateTime(r.hora_entrada)}</td>
        <td style="white-space:nowrap;">${r.hora_salida ? formatDateTime(r.hora_salida) : '<span style="color:var(--text-muted)">—</span>'}</td>
      </tr>`;
  }).join('');
}

/**
 * Descarga el historial como archivo Excel.
 */
function exportToExcel() {
  const q          = historySearch.value.trim();
  const fechaDesde = historyDateFrom.value;
  const fechaHasta = historyDateTo.value;

  const params = new URLSearchParams();
  if (q)          params.set('q', q);
  if (fechaDesde) params.set('fechaDesde', fechaDesde);
  if (fechaHasta) params.set('fechaHasta', fechaHasta);

  // Disparar la descarga directamente mediante un enlace
  window.location.href = `/api/entries/export?${params.toString()}`;
  showToast('Generando archivo Excel...', 'info');
}

/**
 * Limpia los filtros y recarga el historial.
 */
function clearHistoryFilters() {
  historySearch.value   = '';
  historyDateFrom.value = '';
  historyDateTo.value   = '';
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
window.loadHistory = loadHistory;
