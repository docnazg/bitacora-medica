const CACHE = 'bitacora-v20';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(ASSETS.map(a => c.add(a).catch(() => {})))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const isPage = req.mode === 'navigate' || req.url.endsWith('index.html') || req.url.endsWith('manifest.json');
  if (isPage) {
    // Red primero, pero si no hay datos o la señal es mala (más de 3 s), usa la copia guardada
    const fromCache = () => caches.match(req).then(c => c || caches.match('./index.html').then(x => x || caches.match('./')));
    const net = fetch(req, { cache: 'no-store' }).then(res => {
      if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(req, clone)); }
      return res;
    });
    const timeout = new Promise(r => setTimeout(r, 3000)).then(fromCache);
    e.respondWith(
      Promise.race([net.catch(fromCache), timeout.then(c => c || net)])
        .then(r => r || net)
        .catch(fromCache)
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
