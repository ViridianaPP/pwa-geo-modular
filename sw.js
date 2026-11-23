'use strict';

// Subir la versión en cada cambio publicado para forzar la actualización
const NOMBRE_CACHE = 'pwa-geo-modular-v2';

// App Shell con rutas relativas (GitHub Pages publica en un subdirectorio).
// geo-helper.js va incluido para que el módulo esté disponible sin red.
const ARCHIVOS_PRECACHEADOS = [
  './',
  './index.html',
  './styles.css',
  './geo-helper.js',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(NOMBRE_CACHE)
      .then((cache) => cache.addAll(ARCHIVOS_PRECACHEADOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(
        claves
          .filter((clave) => clave !== NOMBRE_CACHE)
          .map((clave) => caches.delete(clave))
      ))
      .then(() => self.clients.claim())
  );
});

// Cache First: primero la caché, si no existe se pide a la red
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((respuestaCacheada) => {
        if (respuestaCacheada) {
          return respuestaCacheada;
        }

        return fetch(event.request)
          .then((respuestaRed) => {
            if (respuestaRed && respuestaRed.status === 200) {
              const copia = respuestaRed.clone();
              caches.open(NOMBRE_CACHE).then((cache) => cache.put(event.request, copia));
            }
            return respuestaRed;
          })
          .catch(() => caches.match('./index.html'));
      })
  );
});
