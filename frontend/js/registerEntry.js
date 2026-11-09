"use strict";

/* ─────────────────────────────────────────────────────────
   registerEntry.js — Lógica de Registrar Entrada
───────────────────────────────────────────────────────── */

let lookupTimeout = null;

const entryForm = document.getElementById("entryForm");
const documentoInput = document.getElementById("entryDocumento");
const nombreInput = document.getElementById("entryNombre");
const empresaInput = document.getElementById("entryEmpresa");
const tipoPersonaSelect = document.getElementById("entryTipoPersona");
const arlSelect = document.getElementById("entryArl");
const epsSelect = document.getElementById("entryEps");
const telefonoInput = document.getElementById("entryTelefono");
const motivoTextarea = document.getElementById("entryMotivo");
const frequentBanner = document.getElementById("frequentVisitorBanner");
const lookupSpinner = document.getElementById("lookupSpinner");
const entryTimeDisplay = document.getElementById("entryTimeDisplay");
const btnClearEntry = document.getElementById("btnClearEntry");
const btnSubmitEntry = document.getElementById("btnSubmitEntry");
const cameraVideo = document.getElementById("cameraVideo");
const capturedPhotoPreview = document.getElementById("capturedPhotoPreview");
const btnCapturePhoto = document.getElementById("btnCapturePhoto");
const btnRetakePhoto = document.getElementById("btnRetakePhoto");
const cameraStatus = document.getElementById("cameraStatus");
const captureCanvas = document.getElementById("captureCanvas");


// ── Detección de escaneo Zebra DS46 ──
const MODIFIER_KEYS = new Set([
  "Shift", "Control", "Alt", "Meta", "CapsLock",
  "AltGraph", "Fn", "FnLock", "Hyper", "Super", "Symbol", "SymbolLock",
]);

// Throttle de avisos (evita que se apilen los toasts)
let ultimoAvisoEscaneo = 0;
const THROTTLE_AVISO_MS = 2500;

let keyLog = [];
let scanTimer = null;
let rafagaActiva = false;
let descartarRafaga = false;  // ⬅️ NUEVO: sabemos que es escáner pero no procesamos

const PAUSA_FIN_ESCANEO_MS = 250;
const MIN_TECLAS_ESCANEO = 15;
const UMBRAL_DURACION_ESCANEO_MS = 1500;
const UMBRAL_RAFAGA_MS = 25;
const MIN_RAFAGA_CONSECUTIVA = 5;

document.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (MODIFIER_KEYS.has(e.key)) return;

  const ahora = performance.now();
  keyLog.push({ key: e.key, time: ahora });

  // Detección de ráfaga de máquina
  if (!rafagaActiva && keyLog.length >= MIN_RAFAGA_CONSECUTIVA) {
    const ultimas = keyLog.slice(-MIN_RAFAGA_CONSECUTIVA);
    let consecutivasRapidas = 0;
    for (let i = 1; i < ultimas.length; i++) {
      if (ultimas[i].time - ultimas[i - 1].time < UMBRAL_RAFAGA_MS) {
        consecutivasRapidas++;
      }
    }
    if (consecutivasRapidas >= MIN_RAFAGA_CONSECUTIVA - 1) {
      rafagaActiva = true;

      if (document.activeElement !== documentoInput) {
        // Cursor fuera del campo: marcamos para descartar PERO seguimos bloqueando teclas
        descartarRafaga = true;

        const t = Date.now();
        if (t - ultimoAvisoEscaneo > THROTTLE_AVISO_MS) {
          ultimoAvisoEscaneo = t;
          console.warn("[Escáner] ⚠️ Cursor no estaba en 'Número de documento'. Lectura descartada.");
          showToast(
            '⚠️ Coloca el cursor en "Número de documento" antes de escanear.',
            "error",
          );
        }
      } else {
        if (documentoInput.value) documentoInput.value = "";
      }
    }
  }

  // 🛡️ CLAVE: bloqueamos Tab/Enter/todo mientras haya ráfaga,
  // incluso si la vamos a descartar. Esto evita que el foco salte por el menú.
  if (rafagaActiva) {
    e.preventDefault();
  }

  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    if (rafagaActiva && !descartarRafaga && keyLog.length >= MIN_TECLAS_ESCANEO) {
      procesarBuffer(keyLog);
    }
    keyLog = [];
    rafagaActiva = false;
    descartarRafaga = false;
  }, PAUSA_FIN_ESCANEO_MS);
});

function procesarBuffer(log) {
  const duracion = log[log.length - 1].time - log[0].time;
  if (duracion > UMBRAL_DURACION_ESCANEO_MS) {
    console.log(`[Escáner] Ráfaga muy lenta (${duracion.toFixed(0)}ms). Ignorada.`);
    return;
  }

  const buffer = log
    .map((k) => (k.key === "Tab" ? "\t" : k.key === "Enter" ? "\n" : k.key))
    .join("");

  console.log(
    `[Escáner] Ráfaga (${log.length} teclas, ${duracion.toFixed(0)}ms):`,
    JSON.stringify(buffer),
  );

  if (!buffer.includes("\t")) {
    console.log("[Escáner] Sin tabs. No es cédula.");
    return;
  }

  const camposRaw = buffer.split("\t").map((c) => c.trim());

  // Buscar el primer campo numérico de 6-10 dígitos (el documento)
  const idxDoc = camposRaw.findIndex((c) => /^\d{6,10}$/.test(c));
  if (idxDoc === -1) {
    console.warn("[Escáner] No se encontró documento válido:", camposRaw);
    showToast("No se detectó un documento válido. Reintenta.", "error");
    return;
  }

  const campos = camposRaw.slice(idxDoc);
  if (campos.length < 5) {
    console.warn("[Escáner] Faltan campos:", campos);
    showToast("Lectura incompleta. Vuelve a escanear.", "error");
    return;
  }

  procesarCedula(campos);
}

function procesarCedula(campos) {
  const [documento, apellido1, apellido2, nombre1, nombre2Raw] = campos;

  // Normalizamos todo a mayúsculas sin importar el estado de Bloq Mayús
  const apellido1Up = (apellido1 || "").toUpperCase();
  const apellido2Up = (apellido2 || "").toUpperCase();
  const nombre1Up = (nombre1 || "").toUpperCase();

  const nombre2 = (nombre2Raw || "")
    .replace(/[0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();  // ⬅️ aquí también

  const nombreCompleto = [apellido1Up, apellido2Up, nombre1Up, nombre2]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  // Validación: acepta mayúsculas después de normalizar
  const documentoValido = /^\d{6,10}$/.test(documento);
  const nombreValido = /^[A-ZÑ\s]{3,80}$/.test(nombreCompleto); // ✅ ahora sí pasa

  if (!documentoValido || !nombreValido) {
    console.warn("[Escáner] Formato inválido:", { documento, nombreCompleto });
    showToast("Lectura con errores. Vuelve a escanear.", "error");
    return;
  }

  documentoInput.value = documento.replace(/^0+/, "");
  nombreInput.value = nombreCompleto;

  console.log("[Escáner] ✅ Cédula procesada:", { documento, nombreCompleto });
  showToast(`Cédula escaneada: ${nombreCompleto}`, "success");
  documentoInput.dispatchEvent(new Event("input"));
}

// ── Cámara ──
let cameraStream = null;
let capturedPhotoBlob = null;

async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
    cameraVideo.srcObject = cameraStream;
    cameraStatus.textContent = "";
  } catch (err) {
    cameraStatus.textContent =
      "Cámara no disponible. Puede registrar la entrada sin foto.";
    console.warn("No se pudo acceder a la cámara:", err);
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
}

function capturePhoto() {
  const width = cameraVideo.videoWidth;
  const height = cameraVideo.videoHeight;
  captureCanvas.width = width;
  captureCanvas.height = height;
  const ctx = captureCanvas.getContext("2d");
  ctx.drawImage(cameraVideo, 0, 0, width, height);
  captureCanvas.toBlob(
    (blob) => {
      capturedPhotoBlob = blob;
      capturedPhotoPreview.src = URL.createObjectURL(blob);
      capturedPhotoPreview.style.display = "block";
      cameraVideo.style.display = "none";
      btnCapturePhoto.style.display = "none";
      btnRetakePhoto.style.display = "inline-flex";
      stopCamera();
    },
    "image/jpeg",
    0.85,
  );
}

async function retakePhoto() {
  capturedPhotoBlob = null;
  capturedPhotoPreview.style.display = "none";
  cameraVideo.style.display = "block";
  btnCapturePhoto.style.display = "inline-flex";
  btnRetakePhoto.style.display = "none";
  await startCamera();
}

btnCapturePhoto.addEventListener("click", capturePhoto);
btnRetakePhoto.addEventListener("click", retakePhoto);

// ── Reloj ──
let entryClockInterval = null;

function startEntryFormClock() {
  function tick() {
    entryTimeDisplay.textContent = new Date().toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }
  tick();
  entryClockInterval = setInterval(tick, 1000);
}

function stopEntryFormClock() {
  if (entryClockInterval) {
    clearInterval(entryClockInterval);
    entryClockInterval = null;
  }
}

// ── Autocompletado ──
documentoInput.addEventListener("input", () => {
  clearTimeout(lookupTimeout);
  const doc = documentoInput.value.trim();

  if (doc.length < 3) {
    frequentBanner.style.display = "none";
    return;
  }

  lookupTimeout = setTimeout(async () => {
    lookupSpinner.style.display = "flex";
    try {
      const data = await apiFetch(
        `/visitors/lookup?documento=${encodeURIComponent(doc)}`,
      );
      if (data.found && data.visitor) {
        const v = data.visitor;
        nombreInput.value = v.nombre;
        empresaInput.value = v.empresa;
        tipoPersonaSelect.value = v.tipo_persona;
        telefonoInput.value = v.telefono || "";
        frequentBanner.style.display = "flex";
      } else {
        frequentBanner.style.display = "none";
      }
    } catch (_) {
      frequentBanner.style.display = "none";
    } finally {
      lookupSpinner.style.display = "none";
    }
  }, 500);
});

// ── Submit ──
entryForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    documento: documentoInput.value.trim(),
    nombre: nombreInput.value.trim(),
    empresa: empresaInput.value.trim(),
    tipo_persona: tipoPersonaSelect.value,
    telefono: telefonoInput.value.trim(),
    motivo: motivoTextarea.value.trim(),
    arl: arlSelect.value,
    eps: epsSelect.value,
    soporte_seguridad_social: (document.querySelector('input[name="soporteSS"]:checked') || {}).value || "",
    notificacion_riesgo: (document.querySelector('input[name="notificacionRiesgo"]:checked') || {}).value || "",
    autoriza_datos: (document.querySelector('input[name="autorizaDatos"]:checked') || {}).value || "",
  };

  const requiredLabels = {
    documento: "Número de documento",
    nombre: "Nombre completo",
    empresa: "Empresa",
    tipo_persona: "Tipo de persona",
    soporte_seguridad_social: "Presenta soporte de seguridad social",
    notificacion_riesgo: "Notificación de riesgo y punto de encuentro",
    autoriza_datos: "Autoriza el tratamiento de datos personales",
  };
  for (const [key, label] of Object.entries(requiredLabels)) {
    if (!payload[key]) {
      showToast(`El campo "${label}" es obligatorio.`, "error");
      return;
    }
  }

  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => formData.append(key, value));
  if (capturedPhotoBlob) {
    formData.append("foto", capturedPhotoBlob, "foto.jpg");
  }

  btnSubmitEntry.disabled = true;
  setLoading(true);

  try {
    const token = localStorage.getItem("coneq_token");
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al registrar la entrada.");

    showToast("✅  Entrada registrada correctamente.", "success");
    clearEntryForm();

    if (document.getElementById("page-dashboard").classList.contains("active")) {
      loadDashboard();
    }
  } catch (err) {
    showToast(err.message || "Error al registrar la entrada.", "error");
  } finally {
    btnSubmitEntry.disabled = false;
    setLoading(false);
  }
});

function clearEntryForm() {
  entryForm.reset();
  frequentBanner.style.display = "none";
  documentoInput.focus();
  capturedPhotoBlob = null;
  capturedPhotoPreview.style.display = "none";
  cameraVideo.style.display = "block";
  btnCapturePhoto.style.display = "inline-flex";
  btnRetakePhoto.style.display = "none";
  startCamera();
}

// Mantener el foco en el campo de documento cuando se entra a la página
// (excepto si el usuario está escribiendo en otro campo)
window.focusDocumentoEntry = function () {
  const activo = document.activeElement;
  // Si no hay nada enfocado o está en body, enfocamos documento
  if (!activo || activo === document.body) {
    documentoInput.focus();
  }
};


btnClearEntry.addEventListener("click", clearEntryForm);

window.startEntryFormClock = startEntryFormClock;
window.stopEntryFormClock = stopEntryFormClock;
window.startCamera = startCamera;
window.stopCamera = stopCamera;