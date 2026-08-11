"use strict";
let _dashInterval = null;

async function loadDashboard() {
  try {
    const data = await apiFetch("/dashboard");
    const s = data.stats;
    document.getElementById("statDentro").textContent = s.dentro;
    document.getElementById("statSalidos").textContent = s.salidos;
    document.getElementById("statIngresos").textContent = s.total_ingresos;
    document.getElementById("statSalidas").textContent = s.total_salidas;
    renderDashboardTable(data.records);
  } catch (err) {
    showToast(err.message || "Error al cargar dashboard.", "error");
  }
}

function renderDashboardTable(records) {
  const tbody = document.getElementById("dashboardTableBody");
  const count = document.getElementById("dashboardCount");
  count.textContent = `${records.length} registro${records.length !== 1 ? "s" : ""}`;
  if (!records.length) {
    tbody.innerHTML =
      '<tr class="empty-row"><td colspan="6">No hay registros para hoy.</td></tr>';
    return;
  }
  tbody.innerHTML = records
    .map((r) => {
      const inside = r.estado === "Dentro";
      const tc = (r.tipo_persona || "").toLowerCase();
      return `<tr>
      <td>${inside ? '<span class="status-dot inside">Dentro</span>' : '<span class="status-dot outside">Salió</span>'}</td>
      <td><strong>${escapeHtml(r.nombre)}</strong></td>
      <td>${escapeHtml(r.empresa)}</td>
      <td><span class="tipo-chip ${tc}">${r.tipo_persona}</span></td>
      <td>${formatTime(r.hora_entrada)}</td>
      <td>${r.hora_salida ? formatTime(r.hora_salida) : '<span style="color:var(--text-muted)">—</span>'}</td>
    </tr>`;
    })
    .join("");
}

function startDashboardAutoRefresh() {
  stopDashboardAutoRefresh();
  _dashInterval = setInterval(loadDashboard, 30000);
}
function stopDashboardAutoRefresh() {
  if (_dashInterval) {
    clearInterval(_dashInterval);
    _dashInterval = null;
  }
}

document
  .getElementById("btnRefreshDashboard")
  .addEventListener("click", loadDashboard);

window.loadDashboard = loadDashboard;
window.startDashboardAutoRefresh = startDashboardAutoRefresh;
window.stopDashboardAutoRefresh = stopDashboardAutoRefresh;
