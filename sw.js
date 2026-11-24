// Toppkalender service worker: lets the app open without network and keeps visited map tiles.
const APP = 'toppkalender-app-v6';
const TILES = 'toppkalender-kart-v1';
const SHELL = ['./julekalender.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== APP && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // The app page: try the network first so updates arrive, fall back to the saved copy offline.
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(APP).then(x => x.put('./julekalender.html', c)); return r; })
      .catch(() => caches.match('./julekalender.html')));
    return;
  }
  // Map tiles: use the saved tile if there is one, otherwise fetch and save it.
  if (url.hostname === 'cache.kartverket.no' || url.hostname === 'tile.openstreetmap.org') {
    e.respondWith(caches.open(TILES).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }))));
    return;
  }
  // Everything else (Leaflet, fonts, icons): saved copy first, then network.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok && (url.origin === location.origin || url.hostname.endsWith('unpkg.com') || url.hostname.includes('fonts.g'))) { const c = r.clone(); caches.open(APP).then(x => x.put(req, c)); }
    return r;
  })));
});
