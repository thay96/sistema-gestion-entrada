"use strict";

/* ─────────────────────────────────────────────────────────
   registerEntry.js — Lógica de Registrar Entrada
   Incluye auto-completado para visitantes frecuentes
───────────────────────────────────────────────────────── */

let lookupTimeout = null;

// Referencias DOM
const entryForm = document.getElementById("entryForm");
const documentoInput = document.getElementById("entryDocumento");
const nombreInput = document.getElementById("entryNombre");
const empresaInput = document.getElementById("entryEmpresa");
const tipoPersonaSelect = document.getElementById("entryTipoPersona");
const correoInput = document.getElementById("entryCorreo");
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

// ── Captura de escaneo de cédula (lector Zebra en modo teclado) ──
let scanBuffer = "";
let scanTimer = null;
let lastKeyTime = 0;
let escaneoEnCurso = false;
let focoAlIniciarEscaneo = null;

const UMBRAL_VELOCIDAD_ESCANER_MS = 25;

entryForm.addEventListener("keydown", (e) => {
  const ahora = Date.now();
  const tiempoDesdeUltimaTecla = ahora - lastKeyTime;
  lastKeyTime = ahora;

  if (tiempoDesdeUltimaTecla < UMBRAL_VELOCIDAD_ESCANER_MS) {
    if (!escaneoEnCurso) {
      // Justo detectamos el inicio del escaneo. Guardamos dónde estaba el
      // cursor y limpiamos el único carácter que alcanzó a colarse ahí.
      focoAlIniciarEscaneo = document.activeElement;
      if (focoAlIniciarEscaneo && "value" in focoAlIniciarEscaneo) {
        focoAlIniciarEscaneo.value = "";
      }
    }
    escaneoEnCurso = true;
  }

  if (escaneoEnCurso) {
    e.preventDefault();

    if (e.key === "Tab" || e.key === "Enter") {
      scanBuffer += e.key === "Tab" ? "\t" : "\n";
    } else if (e.key.length === 1) {
      scanBuffer += e.key;
    }

    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      procesarEscaneo();
      escaneoEnCurso = false;
    }, 250);

    return;
  }

  if (e.key === "Tab" || e.key === "Enter") {
    scanBuffer += e.key === "Tab" ? "\t" : "\n";
  } else if (e.key.length === 1) {
    scanBuffer += e.key;
  }

  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    scanBuffer = "";
  }, 250);
});

function procesarEscaneo() {
  const buffer = scanBuffer;
  scanBuffer = "";

  if (!buffer) return;

  console.log("[Escáner] Buffer capturado:", JSON.stringify(buffer));

  // Si el cursor no estaba en el campo correcto, avisamos y descartamos todo
  if (focoAlIniciarEscaneo !== documentoInput) {
    console.warn(
      "[Escáner] Cursor no estaba en el campo de documento. Escaneo descartado.",
    );
    showToast(
      'Por favor, coloca el cursor en "Número de documento" antes de escanear.',
      "error",
    );
    return;
  }

  if (!buffer.includes("\t")) {
    if (buffer.length > 3) {
      console.warn("[Escáner] Formato no reconocido:", buffer);
      showToast(
        "No se pudo interpretar la lectura del lector. Intenta de nuevo.",
        "error",
      );
    }
    return;
  }

  const campos = buffer.split("\t").map((c) => c.trim());
  if (campos.length < 5 || !campos[0]) {
    console.warn("[Escáner] Lectura incompleta:", campos);
    showToast(
      "Lectura de cédula incompleta. Por favor, vuelve a escanear.",
      "error",
    );
    return;
  }

  procesarCedula(campos);
}

function procesarCedula(campos) {
  const [documento, apellido1, apellido2, nombre1, nombre2Raw] = campos;
  const nombre2 = (nombre2Raw || "").replace(/[0-9]+/g, "").trim();
  const nombreCompleto = [apellido1, apellido2, nombre1, nombre2]
    .filter(Boolean)
    .join(" ");

  // Validación: rechaza lecturas con caracteres inválidos (posible error físico del lector)
  const documentoValido = /^\d{6,10}$/.test(documento);
  const nombreValido = /^[A-ZÑ\s]{3,80}$/.test(nombreCompleto);

  if (!documentoValido || !nombreValido) {
    console.warn(
      "[Escáner] Datos con formato inválido, posible error de lectura:",
      { documento, nombreCompleto },
    );
    showToast(
      "La lectura parece tener errores. Por favor, vuelve a escanear la cédula.",
      "error",
    );
    return;
  }

  documentoInput.value = documento.replace(/^0+/, "");
  nombreInput.value = nombreCompleto;

  console.log("[Escáner] Cédula procesada:", { documento, nombreCompleto });
  showToast(`Cédula escaneada: ${nombreCompleto}`, "success");
  documentoInput.dispatchEvent(new Event("input"));
}

function procesarCedulaNueva(lineas) {
  const [linea1, linea2, linea3] = lineas;

  const documento = linea2
    .substring(18, 28)
    .replace(/[<0]+$/, "")
    .trim();

  const [apellidosRaw, nombresRaw] = linea3.split("<<");
  const apellidos = (apellidosRaw || "").split("<").filter(Boolean);
  const nombres = (nombresRaw || "").split("<").filter(Boolean);
  const nombreCompleto = [...apellidos, ...nombres].join(" ");

  documentoInput.value = documento;
  nombreInput.value = nombreCompleto;

  console.log("[Escáner] Cédula nueva procesada:", {
    documento,
    nombreCompleto,
  });
  showToast(`Cédula (nueva) escaneada: ${nombreCompleto}`, "success");
  documentoInput.dispatchEvent(new Event("input"));
}

let cameraStream = null;
let capturedPhotoBlob = null;

// ── Conexión con el servidor para recibir datos del lector de cédulas ──

let entryClockInterval = null;

/**
 * Actualiza el reloj del formulario de entrada en tiempo real.
 */
function startEntryFormClock() {
  function tick() {
    const now = new Date();
    entryTimeDisplay.textContent = now.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
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
 * Solicita permiso y activa la cámara, mostrando el video en vivo.
 */
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

/**
 * Apaga la cámara (libera el dispositivo para que otras apps puedan usarla).
 */
function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
}

/**
 * Toma una "foto" del cuadro actual del video, usando el canvas oculto como intermediario.
 */
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
      const previewUrl = URL.createObjectURL(blob);
      capturedPhotoPreview.src = previewUrl;

      // Mostrar la foto capturada, ocultar el video en vivo
      capturedPhotoPreview.style.display = "block";
      cameraVideo.style.display = "none";
      btnCapturePhoto.style.display = "none";
      btnRetakePhoto.style.display = "inline-flex";

      stopCamera(); // Ya no necesitamos la cámara encendida mientras se ve la foto capturada
    },
    "image/jpeg",
    0.85,
  );
}

/**
 * Vuelve a activar la cámara para tomar otra foto.
 */
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

/**
 * Auto-completado: cuando el empleado escribe el documento,
 * busca al visitante en la BD y rellena los campos automáticamente.
 */
documentoInput.addEventListener("input", () => {
  clearTimeout(lookupTimeout);
  const doc = documentoInput.value.trim();

  // Limpiar banner si el campo está vacío
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
        correoInput.value = v.correo;
        telefonoInput.value = v.telefono || "";
        frequentBanner.style.display = "flex";
      } else {
        frequentBanner.style.display = "none";
      }
    } catch (_) {
      // Silencioso — puede ser que el visitante no exista aún
      frequentBanner.style.display = "none";
    } finally {
      lookupSpinner.style.display = "none";
    }
  }, 500);
});

/**
 * Envío del formulario de entrada.
 */

entryForm.addEventListener("submit", async (e) => {
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
    documento: "Número de documento",
    nombre: "Nombre completo",
    empresa: "Empresa",
    tipo_persona: "Tipo de persona",
    correo: "Correo electrónico",
  };
  for (const [key, label] of Object.entries(requiredLabels)) {
    if (!payload[key]) {
      showToast(`El campo "${label}" es obligatorio.`, "error");
      return;
    }
  }

  // Armar el FormData (texto + foto, si existe)
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) =>
    formData.append(key, value),
  );
  if (capturedPhotoBlob) {
    formData.append("foto", capturedPhotoBlob, "foto.jpg");
  }

  btnSubmitEntry.disabled = true;
  setLoading(true);

  try {
    const token = localStorage.getItem("coneq_token");
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }, // Sin Content-Type: el navegador lo pone solo con FormData
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al registrar la entrada.");

    showToast("✅  Entrada registrada correctamente.", "success");
    clearEntryForm();

    // Si el dashboard está visible, actualizar
    if (
      document.getElementById("page-dashboard").classList.contains("active")
    ) {
      loadDashboard();
    }
  } catch (err) {
    showToast(err.message || "Error al registrar la entrada.", "error");
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
  frequentBanner.style.display = "none";
  documentoInput.focus();

  // Reiniciar la cámara para la siguiente persona
  capturedPhotoBlob = null;
  capturedPhotoPreview.style.display = "none";
  cameraVideo.style.display = "block";
  btnCapturePhoto.style.display = "inline-flex";
  btnRetakePhoto.style.display = "none";
  startCamera();
}

btnClearEntry.addEventListener("click", clearEntryForm);

// Exponer
window.startEntryFormClock = startEntryFormClock;
window.stopEntryFormClock = stopEntryFormClock;
window.startCamera = startCamera;
window.stopCamera = stopCamera;
