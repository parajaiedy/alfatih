/* Service worker Kebun Belajar Al Fatih — supaya aplikasi jalan tanpa internet.
   Perbaikan penting:
   - Nama cache diberi versi + dihapus saat versi berubah (update tidak nyangkut).
   - Halaman (navigasi) memakai network-first agar pembaruan aplikasi cepat terpakai.
   - Berkas statis & audio memakai cache-first, dengan pembaruan di latar belakang.
   - Fallback halaman HTML HANYA untuk navigasi. Permintaan yang gagal (mis. MP3
     belum ada) dibiarkan gagal (bukan mengembalikan HTML) agar pemutar suara
     tahu berkasnya tidak ada lalu memakai suara bawaan perangkat. */
const VERSION = 'v3';
const CACHE = 'alfatih-' + VERSION;
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

async function precacheAudio(cache) {
  try {
    const r = await fetch('./audio/manifest.json', { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    for (const f of (j.files || [])) { try { await cache.add('./audio/' + f); } catch (err) {} }
  } catch (err) {}
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const f of CORE) { try { await c.add(f); } catch (err) {} }
    await precacheAudio(c);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'skip-waiting') self.skipWaiting();
  if (e.data === 'cache-audio') e.waitUntil((async () => { const c = await caches.open(CACHE); await precacheAudio(c); })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // jangan sentuh aset luar

  // Navigasi halaman: coba jaringan dulu, jatuh ke cache bila offline.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res && res.ok) { c.put('./index.html', res.clone()); return res; }
        throw new Error('bad response');
      } catch (err) {
        return (await c.match('./index.html')) || (await c.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Berkas statis / audio: cache-first, lalu jaringan (disimpan untuk lain kali).
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok) { try { c.put(req, res.clone()); } catch (err) {} }
      return res;
    } catch (err) {
      // Tidak ada di cache & jaringan mati -> biarkan gagal (jangan kirim HTML).
      return Response.error();
    }
  })());
});
