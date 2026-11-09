'use strict';

// Listas de entidades. Para agregar o quitar una, edita solo este archivo.
// Lista base: verificar contra la que maneje la empresa (SST).
const LISTA_ARL = [
  'ARL SURA',
  'Positiva Compañía de Seguros',
  'Colmena Seguros',
  'Seguros Bolívar',
  'Seguros de Vida Alfa',
  'AXA Colpatria',
  'Liberty Seguros',
  'Mapfre Colombia Vida Seguros',
  'La Equidad Seguros',
];

const LISTA_EPS = [
  'Asmet Salud',
  'Cajacopi Atlántico',
  'Capital Salud',
  'Capresoca',
  'Compensar',
  'Coosalud',
  'Emssanar',
  'Familiar de Colombia',
  'Famisanar',
  'Mutual Ser',
  'Nueva EPS',
  'Salud Total',
  'Sanitas',
  'Savia Salud',
  'SOS',
  'EPS Sura',
];

function llenarSelectEntidades(idSelect, lista) {
  const select = document.getElementById(idSelect);
  if (!select) return;
  const ordenada = [...lista].sort((a, b) => a.localeCompare(b, 'es'));
  const opciones = [...ordenada, 'Otra', 'No aplica'];
  select.innerHTML = '<option value="">Seleccione...</option>' +
    opciones.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
}

llenarSelectEntidades('entryArl', LISTA_ARL);
llenarSelectEntidades('entryEps', LISTA_EPS);