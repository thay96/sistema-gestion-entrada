"use strict";
// ── Register Exit with smart autocomplete ──
let _lookupTimer = null;
let activeVisitors = [];
const exitSearchInput = document.getElementById("exitSearchInput");
const exitDropdown = document.getElementById("exitDropdown");
const exitSearchResults = document.getElementById("exitSearchResults");
const exitResultsList = document.getElementById("exitResultsList");
const exitEmptyState = document.getElementById("exitEmptyState");
const exitNoResults = document.getElementById("exitNoResults");

exitSearchInput.addEventListener("input", () => {
  clearTimeout(_lookupTimer);
  const q = exitSearchInput.value.trim();
  if (q.length < 2) {
    exitDropdown.classList.remove("open");
    return;
  }
  _lookupTimer = setTimeout(() => fetchSuggestions(q), 280);
});

async function fetchSuggestions(q) {
  try {
    const data = await apiFetch(`/visitors/search?q=${encodeURIComponent(q)}`);
    renderDropdown(data.results || []);
  } catch (_) {
    exitDropdown.classList.remove("open");
  }
}

function renderDropdown(results) {
  if (!results.length) {
    exitDropdown.classList.remove("open");
    return;
  }
  exitDropdown.innerHTML = results
    .map(
      (r) => `
    <div class="ac-item" data-id="${r.id}" data-nombre="${escapeHtml(r.nombre)}" data-empresa="${escapeHtml(r.empresa)}" data-doc="${escapeHtml(r.documento)}" data-entrada="${r.hora_entrada}">
      <div class="ac-avatar">${r.nombre.charAt(0).toUpperCase()}</div>
      <div class="ac-info">
        <div class="ac-name">${escapeHtml(r.nombre)}</div>
        <div class="ac-detail">Doc: ${escapeHtml(r.documento)} · ${escapeHtml(r.empresa)}</div>
      </div>
    </div>`,
    )
    .join("");
  exitDropdown.classList.add("open");
  exitDropdown.querySelectorAll(".ac-item").forEach((item) => {
    item.addEventListener("click", () => selectFromDropdown(item));
  });
}

function selectFromDropdown(item) {
  exitDropdown.classList.remove("open");
  const card = {
    id: item.dataset.id,
    nombre: item.dataset.nombre,
    empresa: item.dataset.empresa,
    documento: item.dataset.doc,
    hora_entrada: item.dataset.entrada,
  };
  const yaExiste = activeVisitors.some((v) => String(v.id) === String(card.id));
  if (!yaExiste) {
    activeVisitors.push(card);
  } else {
    showToast("Esa persona ya está en la lista.", "info");
  }
  exitSearchInput.value = "";
  renderExitCards(activeVisitors);
  exitSearchResults.style.display = "block";
  exitEmptyState.style.display = "none";
  exitNoResults.style.display = "none";
}

document.addEventListener("click", (e) => {
  if (!exitDropdown.contains(e.target) && e.target !== exitSearchInput)
    exitDropdown.classList.remove("open");
});

function renderExitCards(visitors) {
  exitResultsList.innerHTML = visitors
    .map(
      (v) => `
    <div class="exit-visitor-card">
      <div class="exit-visitor-name">${escapeHtml(v.nombre)}</div>
      <div class="exit-visitor-company">${escapeHtml(v.empresa)}</div>
      <div class="exit-visitor-meta">
        <span>📄 <strong>Documento:</strong> ${escapeHtml(v.documento)}</span>
        <span>🕐 <strong>Entrada:</strong> ${formatTime(v.hora_entrada)}</span>
      </div>
      <button class="exit-btn-salida" data-id="${v.id}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Registrar Salida
      </button>
    </div>`,
    )
    .join("");
  exitResultsList
    .querySelectorAll(".exit-btn-salida")
    .forEach((btn) => btn.addEventListener("click", () => handleExit(btn)));
}

async function handleExit(btn) {
  const id = btn.dataset.id;
  btn.disabled = true;
  btn.textContent = "Registrando...";
  setLoading(true);
  try {
    await apiFetch(`/entries/${id}/exit`, { method: "PUT" });
    showToast("Salida registrada correctamente.", "success");
    activeVisitors = activeVisitors.filter((v) => v.id !== id);
    const card = btn.closest(".exit-visitor-card");
    card.style.transition = "opacity .35s,transform .35s";
    card.style.opacity = "0";
    card.style.transform = "scale(0.95)";
    setTimeout(() => {
      card.remove();
      if (!exitResultsList.querySelector(".exit-visitor-card")) {
        exitSearchResults.style.display = "none";
        exitEmptyState.style.display = "flex";
      }
    }, 350);
  } catch (err) {
    showToast(err.message || "Error al registrar salida.", "error");
    btn.disabled = false;
    btn.textContent = "Registrar Salida";
  } finally {
    setLoading(false);
  }
}

function resetExitPage() {
  exitSearchInput.value = "";
  exitDropdown.classList.remove("open");
  exitNoResults.style.display = "none";
  activeVisitors = [];
  loadActiveVisitors();
}

async function loadActiveVisitors() {
  try {
    const data = await apiFetch("/entries/active");
    activeVisitors = data.records || [];
    if (activeVisitors.length) {
      renderExitCards(activeVisitors);
      exitSearchResults.style.display = "block";
      exitEmptyState.style.display = "none";
    } else {
      exitSearchResults.style.display = "none";
      exitEmptyState.style.display = "flex";
    }
  } catch (err) {
    showToast(err.message || "Error al cargar visitantes activos.", "error");
  }
}

const btnExitSearch = document.getElementById("btnExitSearch");

btnExitSearch.addEventListener("click", () => buscarVisitante());

exitSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    buscarVisitante();
  }
});

async function buscarVisitante() {
  const q = exitSearchInput.value.trim();
  exitDropdown.classList.remove("open");

  // Si el campo está vacío, mostrar de nuevo la lista completa de "Dentro"
  if (q.length < 2) {
    exitNoResults.style.display = "none";
    loadActiveVisitors();
    return;
  }

  setLoading(true);
  try {
    const data = await apiFetch(`/visitors/search?q=${encodeURIComponent(q)}`);
    const results = data.results || [];

    // 1. Limpiar el contenedor antes de pintar los nuevos resultados
    exitResultsList.innerHTML = "";

    // 2. Filtrar por IDs únicos (por si el backend repite algo)
    const idsVistos = new Set();
    activeVisitors = results.filter((r) => {
      const id = String(r.id);
      if (idsVistos.has(id)) return false;
      idsVistos.add(id);
      return true;
    });

    if (activeVisitors.length) {
      renderExitCards(activeVisitors);
      exitSearchResults.style.display = "block";
      exitEmptyState.style.display = "none";
      exitNoResults.style.display = "none";
    } else {
      exitSearchResults.style.display = "none";
      exitEmptyState.style.display = "none";
      exitNoResults.style.display = "flex";
    }
  } catch (err) {
    showToast(err.message || "Error al buscar visitante.", "error");
  } finally {
    setLoading(false);
  }
}


window.resetExitPage = resetExitPage;
