const CACHE_NAME = 'chants-acp-v8';
const STATIC_ASSETS = [
  './', './index.html', './lsg1910.js', './manifest.json',
  './icon-192.png', './icon-512.png', './presentation-tools.js',
  './projection.html', './projection.js', './regie.css',
  './slide-fit.js', './editor.js', './editor.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('chants-acp-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Les appels Firebase, les écritures et les autres services restent au réseau.
  if (event.request.method !== 'GET' ||
      new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.status === 200 && response.type === 'basic') {
        const clone = response.clone();
        event.waitUntil(caches.open(CACHE_NAME)
          .then(cache => cache.put(event.request, clone)).catch(() => {}));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(event.request);
      return cached || new Response('Contenu indisponible hors connexion.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    })
  );
});
