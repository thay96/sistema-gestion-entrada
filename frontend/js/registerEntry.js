'use strict';

/* ─────────────────────────────────────────────────────────
   registerEntry.js — Lógica de Registrar Entrada
   Incluye auto-completado para visitantes frecuentes
───────────────────────────────────────────────────────── */

let lookupTimeout = null;

// Referencias DOM
const entryForm = document.getElementById('entryForm');
const documentoInput = document.getElementById('entryDocumento');
const nombreInput = document.getElementById('entryNombre');
const empresaInput = document.getElementById('entryEmpresa');
const tipoPersonaSelect = document.getElementById('entryTipoPersona');
const correoInput = document.getElementById('entryCorreo');
const telefonoInput = document.getElementById('entryTelefono');
const motivoTextarea = document.getElementById('entryMotivo');
const frequentBanner = document.getElementById('frequentVisitorBanner');
const lookupSpinner = document.getElementById('lookupSpinner');
const entryTimeDisplay = document.getElementById('entryTimeDisplay');
const btnClearEntry = document.getElementById('btnClearEntry');
const btnSubmitEntry = document.getElementById('btnSubmitEntry');

let entryClockInterval = null;

/**
 * Actualiza el reloj del formulario de entrada en tiempo real.
 */
function startEntryFormClock() {
  function tick() {
    const now = new Date();
    entryTimeDisplay.textContent = now.toLocaleTimeString('es-CO', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  }
  tick();
  entryClockInterval = setInterval(tick, 1000);
}

/**
 * Detiene el reloj del formulario.
 */
function stopEntryFormClock() {
  if (entryClockInterval) {
    clearInterval(entryClockInterval);
    entryClockInterval = null;
  }
}

/**
 * Auto-completado: cuando el empleado escribe el documento,
 * busca al visitante en la BD y rellena los campos automáticamente.
 */
documentoInput.addEventListener('input', () => {
  clearTimeout(lookupTimeout);
  const doc = documentoInput.value.trim();

  // Limpiar banner si el campo está vacío
  if (doc.length < 3) {
    frequentBanner.style.display = 'none';
    return;
  }

  lookupTimeout = setTimeout(async () => {
    lookupSpinner.style.display = 'flex';
    try {
      const data = await apiFetch(`/visitors/lookup?documento=${encodeURIComponent(doc)}`);

      if (data.found && data.visitor) {
        const v = data.visitor;
        nombreInput.value = v.nombre;
        empresaInput.value = v.empresa;
        tipoPersonaSelect.value = v.tipo_persona;
        correoInput.value = v.correo;
        telefonoInput.value = v.telefono || '';
        frequentBanner.style.display = 'flex';

      } else {
        frequentBanner.style.display = 'none';
      }
    } catch (_) {
      // Silencioso — puede ser que el visitante no exista aún
      frequentBanner.style.display = 'none';
    } finally {
      lookupSpinner.style.display = 'none';
    }
  }, 500);
});

/**
 * Envío del formulario de entrada.
 */
entryForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    documento: documentoInput.value.trim(),
    nombre: nombreInput.value.trim(),
    empresa: empresaInput.value.trim(),
    tipo_persona: tipoPersonaSelect.value,
    correo: correoInput.value.trim(),
    telefono: telefonoInput.value.trim(),
    motivo: motivoTextarea.value.trim(),
  };

  // Validación front-end
  const requiredLabels = {
    documento: 'Número de documento',
    nombre: 'Nombre completo',
    empresa: 'Empresa',
    tipo_persona: 'Tipo de persona',
    correo: 'Correo electrónico',
  };
  for (const [key, label] of Object.entries(requiredLabels)) {
    if (!payload[key]) {
      showToast(`El campo "${label}" es obligatorio.`, 'error');
      return;
    }
  }

  btnSubmitEntry.disabled = true;
  setLoading(true);

  try {
    await apiFetch('/entries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    showToast('✅  Entrada registrada correctamente.', 'success');
    clearEntryForm();

    // Si el dashboard está visible, actualizar
    if (document.getElementById('page-dashboard').classList.contains('active')) {
      loadDashboard();
    }
  } catch (err) {
    showToast(err.message || 'Error al registrar la entrada.', 'error');
  } finally {
    btnSubmitEntry.disabled = false;
    setLoading(false);
  }
});

/**
 * Limpia todos los campos del formulario.
 */
function clearEntryForm() {
  entryForm.reset();
  frequentBanner.style.display = 'none';
  documentoInput.focus();
}

btnClearEntry.addEventListener('click', clearEntryForm);

// Exponer
window.startEntryFormClock = startEntryFormClock;
window.stopEntryFormClock = stopEntryFormClock;
