/* Service worker de Kids Learn: la app funciona sin conexión. El plugin de compilación (pwa/plugin.ts) rellena las dos marcas. */
const VERSION = 'o5q681';
const PRECACHE = ["assets/art-BdvZJrUA.js","assets/breakout-scene-DtHJNbd_.js","assets/browser-sql-XUU0twEQ.js","assets/catch-stars-scene-DMNb5NYU.js","assets/index-CayXSskH.css","assets/index-XAP6ivo9.js","assets/sql-wasm-C1D_RJuy.wasm","assets/tauri-sql-B8Ta_Dar.js","fonts/OpenMoji-color.woff2","icons/icon-192.png","icons/icon-512.png","index.html","manifest.webmanifest"];
const CORE = `kids-learn-core-${VERSION}`;
/** Modelos de voz: pesan ~80 MB, se guardan la primera vez que se usan y no se borran al actualizar. */
const MODELS = 'kids-learn-models-v1';

const scope = self.registration.scope;
const url = path => new URL(path, scope).href;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CORE).then(cache => cache.addAll(['./', ...PRECACHE].map(url))).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('kids-learn-core-') && k !== CORE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const cacheFirst = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  // Los módulos se piden con CORS y el servidor responde con «Vary: Origin»: sin ignoreVary la copia guardada no coincidiría.
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.status === 200) await cache.put(request, res.clone());
  return res;
};

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const u = new URL(request.url);
  if (u.origin !== self.location.origin) return;

  if (u.pathname.includes('/models/')) {
    event.respondWith(cacheFirst(request, MODELS));
    return;
  }
  // Al abrir la app: primero la red (por si hay versión nueva) y, sin conexión, la copia guardada.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.open(CORE).then(c => c.match(url('./'), { ignoreVary: true }))),
    );
    return;
  }
  event.respondWith(cacheFirst(request, CORE).catch(() => new Response('', { status: 504 })));
});
