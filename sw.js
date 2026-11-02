/* AVE · caché del juego (modelos y atlas HD).
   Solo corre en la build, que registra sw.js?b=<sha de ave:build>. La primera visita baja cada archivo
   al pedirlo y lo guarda; la siguiente lo sirve de aquí si el sha no cambió. Un sha nuevo vacía la caché vieja.
   No precarga: el atlas no entra dos veces en el arranque. */
const SHA = new URL(self.location.href).searchParams.get('b') || 'dev';
const CACHE = 'av-modelos-' + SHA;

function interesa(path) {
  return /\/tex_hd\/hd_[a-z0-9_]+\.jpe?g$/i.test(path) || /_glb\.js$/i.test(path) || /\.glb$/i.test(path);
}

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.filter(k => k.indexOf('av-modelos-') === 0 && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.mode === 'navigate') return;
  let path = '';
  try { path = new URL(req.url).pathname; } catch (err) { return; }
  if (new URL(req.url).origin !== self.location.origin || !interesa(path)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;
    // Fuera de la caché de este sha se revalida con el servidor: la caché HTTP del navegador (max-age 1 h) podía
    // devolver modelos de una publicación anterior rota (27-oct, Amazona Flight sin texturas).
    const res = await fetch(new Request(req, { cache: 'no-cache' }));
    if (res && res.ok) { try { await cache.put(req, res.clone()); } catch (err) { /* cuota: se sigue en red */ } }
    return res;
  })());
});
