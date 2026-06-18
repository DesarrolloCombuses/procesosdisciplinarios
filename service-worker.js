// Service Worker - Procesos Disciplinarios COMBUSES
// Manejo de versiones: al cambiar APP_VERSION se crea un caché nuevo y se avisa para actualizar.
const APP_VERSION = '2.7.1';
const CACHE = 'pd-cache-v' + APP_VERSION;

// Recursos base que se guardan para funcionar sin conexión (parte visual)
const CORE = [
  'index.html',
  'css/styles.css',
  'js/datos_procesos.js',
  'js/empleados.js',
  'js/faltas.js',
  'js/articulos.js',
  'js/branding.js',
  'js/supabase-config.js',
  'js/notificaciones.js',
  'js/documentos.js',
  'js/app.js',
  'js/campana.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', e => {
  // Se activa de inmediato: la versión nueva se aplica sola (sin tener que pulsar "Actualizar")
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data === 'version') {
    e.source && e.source.postMessage({ type: 'version', version: APP_VERSION });
  }
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // Nunca interceptar lo que no sea GET (ej. POST /generar-pdf al servidor de PDF)
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Solo manejamos peticiones de nuestro propio origen
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/generar-pdf')) return;

  // Network-first: intentamos la red (para tener siempre lo último); si falla, usamos el caché
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});
