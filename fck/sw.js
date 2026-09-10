/* FCK Wunschelf — Service Worker
 *
 * Wichtigste Regel hier: die Seite selbst kommt NETZWERKORIENTIERT.
 * Eine cache-first ausgelieferte index.html führt sonst dazu, dass
 * installierte Nutzer dauerhaft auf einer alten Fassung sitzen bleiben —
 * auch dann, wenn längst eine neue hochgeladen ist.
 *
 *   Seite             network first   frisch, offline aus dem Cache
 *   Icons, Schriften  stale while revalidate
 *   kader.json        network first
 *   Spielplan         network first, offline der letzte Stand
 *
 * VERSION bei jeder Änderung an ausgelieferten Dateien hochzählen.
 */
const VERSION = 'v1.4.1';
const APP   = 'app-'   + VERSION;
const DATEN = 'daten-' + VERSION;

const APP_DATEIEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './datenschutz.html',
  './archivo-black.woff2',
  './barlow-condensed-400.woff2',
  './barlow-condensed-600.woff2',
  './barlow-condensed-700.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(APP).then(c => Promise.all(
      // cache: 'reload' umgeht den HTTP-Cache des Browsers. Ohne das kann die
      // Installation die alte Fassung in den neuen Cache übernehmen.
      APP_DATEIEN.map(u => c.add(new Request(u, {cache: 'reload'})).catch(() => null))
    )).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  const behalten = [APP, DATEN];
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => !behalten.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if(e.data === 'skipWaiting') self.skipWaiting();
});

async function networkFirst(req, cacheName){
  const cache = await caches.open(cacheName);
  try{
    const res = await fetch(req);
    if(res && res.ok) cache.put(req, res.clone());
    return res;
  }catch(e){
    const hit = await cache.match(req, {ignoreSearch: true});
    if(hit) return hit;
    throw e;
  }
}

async function staleWhileRevalidate(req, cacheName){
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req, {ignoreSearch: true});
  const frisch = fetch(req).then(res => {
    if(res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => hit);
  return hit || frisch;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  if(url.hostname === 'api.openligadb.de'){
    e.respondWith(networkFirst(req, DATEN));
    return;
  }

  // Fremdes unangetastet lassen, etwa Vereinswappen
  if(url.origin !== self.location.origin) return;

  if(url.pathname.endsWith('/kader.json')){
    e.respondWith(networkFirst(req, DATEN));
    return;
  }

  // Die Seite selbst: immer erst das Netz fragen
  if(req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html')){
    e.respondWith(networkFirst(req, APP).catch(() => caches.match('./index.html')));
    return;
  }

  e.respondWith(staleWhileRevalidate(req, APP));
});
