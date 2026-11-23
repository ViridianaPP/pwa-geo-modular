'use strict';

/*
  geo-helper.js - Módulo reutilizable de geolocalización en Vanilla JS
  ------------------------------------------------------------------
  - Envuelve navigator.geolocation (que funciona con callbacks) en Promesas.
  - Traduce los códigos de error nativos (1, 2, 3) a mensajes claros.
  - Normaliza la salida: cualquier función de app.js recibe siempre
    { latitud, longitud, precisionMetros, timestamp }.
  - Sin async/await: new Promise(), .then() y .catch().
*/

// Traduce error.code de la Geolocation API a un mensaje entendible
function traducirErrorGeolocalizacion(error) {
  switch (error.code) {
    case 1: // error.PERMISSION_DENIED
      return 'Permiso de ubicación denegado. Puedes ingresar tu zona manualmente.';
    case 2: // error.POSITION_UNAVAILABLE
      return 'No fue posible determinar tu ubicación (señal GPS o Wi-Fi no disponible).';
    case 3: // error.TIMEOUT
      return 'Se agotó el tiempo de espera intentando obtener las coordenadas.';
    default:
      return 'Ocurrió un error inesperado al consultar la ubicación.';
  }
}

// Lectura única de la posición actual, promisificada y reutilizable
function obtenerUbicacionActual(opcionesPersonalizadas) {
  // Opciones por defecto; quien llama puede sobrescribir solo las que necesite
  const opciones = Object.assign(
    {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 30000 // Acepta una lectura reciente de hasta 30 segundos
    },
    opcionesPersonalizadas
  );

  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Este navegador no soporta la API de Geolocalización.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        resolve({
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
          precisionMetros: Math.round(posicion.coords.accuracy),
          timestamp: posicion.timestamp
        });
      },
      (error) => {
        reject(new Error(traducirErrorGeolocalizacion(error)));
      },
      opciones
    );
  });
}

// Consulta (sin mostrar ningún diálogo) si el permiso ya está concedido,
// bloqueado o pendiente. Devuelve 'granted', 'denied' o 'prompt'.
function consultarEstadoPermisoGeo() {
  if (!('permissions' in navigator)) {
    return Promise.resolve('prompt');
  }

  return navigator.permissions.query({ name: 'geolocation' })
    .then((resultado) => resultado.state)
    .catch(() => 'prompt');
}
