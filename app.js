'use strict';

/*
  app.js - Lógica de interfaz
  ------------------------------------------------------------------
  Consume geo-helper.js (cargado antes en index.html):
  - consultarEstadoPermisoGeo(): decide qué mostrar sin abrir diálogos.
  - obtenerUbicacionActual(opciones): lectura promisificada.
  Plan B: si se deniega o falla, se habilita el selector manual de zona.
*/

const UMBRAL_PRECISION_ALTA = 30; // metros

let ubicacionActual = null;

// -----------------------------
// Utilidades de interfaz
// -----------------------------
function mostrarCargando(mensaje) {
  const estado = document.getElementById('estado-geo');
  estado.textContent = mensaje;
  estado.className = 'cargando';
  document.getElementById('btn-adjuntar-ubicacion').disabled = true;
  document.getElementById('btn-confirmar-ubicacion').disabled = true;
}

function terminarCarga() {
  document.getElementById('btn-adjuntar-ubicacion').disabled = false;
  document.getElementById('btn-confirmar-ubicacion').disabled = false;
}

function mostrarMensajeError(mensaje) {
  const estado = document.getElementById('estado-geo');
  estado.textContent = mensaje;
  estado.className = 'error';
}

function mostrarMensajeOk(mensaje) {
  const estado = document.getElementById('estado-geo');
  estado.textContent = mensaje;
  estado.className = 'ok';
}

function formatearHora(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

// Clasifica la lectura según su margen de error (coords.accuracy)
function describirPrecision(metros) {
  if (metros < UMBRAL_PRECISION_ALTA) {
    return { texto: 'Precisión GPS Alta', clase: 'alta' };
  }
  return { texto: 'Ubicación Aproximada (Wi-Fi / IP)', clase: 'aproximada' };
}

function renderizarResultadoUbicacion(ubicacion) {
  const calidad = describirPrecision(ubicacion.precisionMetros);
  const etiqueta = document.getElementById('etiqueta-precision');
  etiqueta.textContent = calidad.texto;
  etiqueta.className = 'etiqueta ' + calidad.clase;

  document.getElementById('dato-latitud').textContent = ubicacion.latitud.toFixed(6);
  document.getElementById('dato-longitud').textContent = ubicacion.longitud.toFixed(6);
  document.getElementById('dato-precision').textContent = '± ' + ubicacion.precisionMetros + ' m';
  document.getElementById('dato-hora').textContent = formatearHora(ubicacion.timestamp);

  document.getElementById('resultado-ubicacion').hidden = false;
}

// Plan B: nunca dejar bloqueado al usuario
function habilitarSelectorManualZona(mostrarAyudaReactivar) {
  document.getElementById('selector-manual').hidden = false;
  document.getElementById('ayuda-reactivar').hidden = !mostrarAyudaReactivar;
}

// -----------------------------
// Lectura real de la ubicación (consume geo-helper.js)
// Se llama SIEMPRE como respuesta a un clic (regla del gesto en iOS).
// -----------------------------
function adjuntarUbicacionAlReporte() {
  mostrarCargando('Obteniendo coordenadas...');

  return obtenerUbicacionActual({ enableHighAccuracy: true, timeout: 8000 })
    .then((ubicacion) => {
      ubicacionActual = ubicacion;
      renderizarResultadoUbicacion(ubicacion);
      document.getElementById('selector-manual').hidden = true;
      mostrarMensajeOk('Ubicación adjuntada al reporte.');
    })
    .catch((error) => {
      console.warn('[Geo] Fallback activado:', error.message);
      ubicacionActual = null;
      document.getElementById('resultado-ubicacion').hidden = true;
      mostrarMensajeError(error.message);
      habilitarSelectorManualZona(error.message.indexOf('denegado') !== -1);
    })
    .then(() => {
      terminarCarga();
    });
}

// -----------------------------
// Flujo de pre-permiso: primero consultamos el estado SIN abrir diálogos
// -----------------------------
function iniciarFlujoUbicacion() {
  mostrarCargando('Revisando el permiso de ubicación...');

  consultarEstadoPermisoGeo()
    .then((estado) => {
      terminarCarga();

      if (estado === 'granted') {
        // Ya lo había autorizado: leemos directo, sin volver a explicar
        document.getElementById('aviso-ubicacion').hidden = true;
        return adjuntarUbicacionAlReporte();
      }

      if (estado === 'denied') {
        // Bloqueado: JS no puede volver a abrir el diálogo -> plan B + ayuda
        document.getElementById('aviso-ubicacion').hidden = true;
        mostrarMensajeError('El permiso de ubicación está bloqueado. Elige tu zona manualmente.');
        habilitarSelectorManualZona(true);
        return;
      }

      // 'prompt': aún no ha decidido -> tarjeta explicativa (pre-permiso)
      document.getElementById('aviso-ubicacion').hidden = false;
      mostrarMensajeOk('Lee el aviso y confirma si deseas compartir tu ubicación.');
    });
}

// -----------------------------
// Reutilización del módulo: lectura rápida de baja precisión
// -----------------------------
function buscarSucursalesCercanas() {
  const salida = document.getElementById('resultado-rapido');
  salida.textContent = 'Obteniendo lectura rápida...';

  return obtenerUbicacionActual({ enableHighAccuracy: false, maximumAge: 60000 })
    .then((ubicacion) => {
      const calidad = describirPrecision(ubicacion.precisionMetros);
      console.log('Filtrando sucursales cerca de ' + ubicacion.latitud + ', ' + ubicacion.longitud);
      salida.textContent = 'Lectura rápida: ' + ubicacion.latitud.toFixed(4) + ', ' +
        ubicacion.longitud.toFixed(4) + ' (± ' + ubicacion.precisionMetros + ' m, ' + calidad.texto + ')';
    })
    .catch((error) => {
      salida.textContent = error.message;
    });
}

// -----------------------------
// Armar el paquete del reporte (con coordenadas o con zona manual)
// -----------------------------
function prepararReporte(evento) {
  evento.preventDefault();

  const datosFormulario = {
    titulo: document.getElementById('titulo').value.trim(),
    descripcion: document.getElementById('descripcion').value.trim()
  };

  if (!datosFormulario.titulo || !datosFormulario.descripcion) {
    mostrarMensajeError('Completa el título y la descripción del reporte.');
    return;
  }

  const zona = document.getElementById('zona-manual').value;
  let paqueteCompleto;

  if (ubicacionActual) {
    paqueteCompleto = Object.assign({}, datosFormulario, { coordenadas: ubicacionActual });
  } else if (zona) {
    paqueteCompleto = Object.assign({}, datosFormulario, { zonaManual: zona });
  } else {
    mostrarMensajeError('Adjunta tu ubicación o elige una zona manualmente.');
    return;
  }

  console.log('Paquete listo para enviar o encolar en IndexedDB:', paqueteCompleto);
  document.getElementById('paquete').textContent = JSON.stringify(paqueteCompleto, null, 2);
  document.getElementById('tarjeta-paquete').hidden = false;
}

// -----------------------------
// Inicialización
// -----------------------------
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-adjuntar-ubicacion').addEventListener('click', iniciarFlujoUbicacion);

  document.getElementById('btn-confirmar-ubicacion').addEventListener('click', () => {
    document.getElementById('aviso-ubicacion').hidden = true;
    adjuntarUbicacionAlReporte();
  });

  document.getElementById('btn-rechazar-ubicacion').addEventListener('click', () => {
    document.getElementById('aviso-ubicacion').hidden = true;
    mostrarMensajeOk('Sin problema: elige tu zona manualmente.');
    habilitarSelectorManualZona(false);
  });

  document.getElementById('btn-lectura-rapida').addEventListener('click', buscarSucursalesCercanas);
  document.getElementById('form-reporte').addEventListener('submit', prepararReporte);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then((registro) => {
        console.log('[SW] Registrado con scope:', registro.scope);
      })
      .catch((error) => {
        console.error('[SW] Error al registrar:', error);
      });
  }
});
