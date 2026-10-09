/* Service worker Al Fatih — supaya aplikasi jalan tanpa internet */
const CACHE = 'alfatih-v2';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const f of CORE) { try { await c.add(f); } catch (err) {} }
    try {
      const r = await fetch('./audio/manifest.json', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        for (const f of (j.files || [])) { try { await c.add('./audio/' + f); } catch (err) {} }
      }
    } catch (err) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      try { if (res && res.ok && new URL(req.url).origin === self.location.origin) c.put(req, res.clone()); } catch (err) {}
      return res;
    } catch (err) {
      const fb = await c.match('./index.html');
      if (fb) return fb;
      throw err;
    }
  })());
});
