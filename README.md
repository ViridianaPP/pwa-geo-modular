# pwa-geo-modular

PWA de reporte técnico con geolocalización consciente: módulo reutilizable `geo-helper.js` (promesas), patrón de pre-permiso, plan B manual e indicador de precisión.

Desarrollado por Viridiana Portilla Palestina.

## Estructura
- `index.html` – Interfaz. Carga `geo-helper.js` **antes** de `app.js`.
- `geo-helper.js` – `obtenerUbicacionActual()`, `consultarEstadoPermisoGeo()` y `traducirErrorGeolocalizacion()`.
- `app.js` – Flujo de pre-permiso, plan B (selector manual de zona), indicador de precisión y armado del reporte.
- `sw.js` – Service Worker *Cache First*; precachea `./geo-helper.js`.
- `manifest.json` – Manifiesto con rutas relativas.

## Reglas cumplidas
- 100% JavaScript Vanilla, sin librerías.
- Sin `async/await`: `new Promise()`, `.then()`, `.catch()`.
- Rutas relativas (`./`) para GitHub Pages bajo HTTPS.

## Flujo de ubicación
1. **Adjuntar mi ubicación** → `consultarEstadoPermisoGeo()`:
   - `granted` → lee directo con `obtenerUbicacionActual()`.
   - `prompt` → muestra la tarjeta explicativa; **Compartir mi ubicación** dispara la lectura real.
   - `denied` → muestra el selector manual de zona y cómo reactivar el permiso.
2. Si la lectura falla (denegado, sin señal o `TIMEOUT`), se habilita el selector manual: la app nunca se bloquea.
3. Indicador de precisión: menos de 30 m → **Precisión GPS Alta**; 30 m o más → **Ubicación Aproximada (Wi-Fi / IP)**.
4. **Lectura rápida (baja precisión)** reutiliza el mismo módulo con `enableHighAccuracy: false` para comparar.

## Probar
1. Abre la URL de GitHub Pages en la laptop y en el teléfono y compara el valor de precisión.
2. En DevTools → Application verifica Manifest, Service Worker y que Cache Storage tenga `geo-helper.js`.
3. Para probar el plan B: bloquea el permiso de ubicación del sitio y vuelve a pulsar **Adjuntar mi ubicación**.

Nota iPhone: la ubicación solo se pide al tocar un botón (Safari ignora solicitudes sin gesto del usuario), y la PWA instalada en inicio tiene permisos separados de Safari.
