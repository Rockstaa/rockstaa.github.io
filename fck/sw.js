/* FCK Wunschelf — Service Worker
 *
 * Drei Strategien, je nach dem, was die Anfrage holt:
 *   App-Dateien   cache first   ändern sich nur beim Deployment
 *   kader.json    network first  soll frisch sein, muss aber offline da sein
 *   Spielplan     network first  dito, offline zeigen wir den letzten Stand
 *   Schriften     stale while revalidate
 *
 * Beim Ausrollen einer neuen Fassung VERSION hochzählen. Der alte Cache wird
 * dann in activate weggeräumt.
 */
const VERSION = 'v1.1.0';
const APP   = 'app-'   + VERSION;   // eigene Dateien
const DATEN = 'daten-' + VERSION;   // Kader und Spielplan
const FONTS = 'fonts-' + VERSION;

const APP_DATEIEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(APP)
      // einzeln, damit eine fehlende Datei nicht die ganze Installation kippt
      .then(c => Promise.all(APP_DATEIEN.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  const behalten = [APP, DATEN, FONTS];
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => !behalten.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
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

async function cacheFirst(req, cacheName){
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req, {ignoreSearch: true});
  if(hit) return hit;
  const res = await fetch(req);
  if(res && res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, cacheName){
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
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

  // Spielplan, Tabelle: frisch bevorzugt, offline der letzte Stand
  if(url.hostname === 'api.openligadb.de'){
    e.respondWith(networkFirst(req, DATEN));
    return;
  }

  // Schriften von Google
  if(url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')){
    e.respondWith(staleWhileRevalidate(req, FONTS));
    return;
  }

  // alles Fremde sonst unangetastet lassen, etwa Vereinswappen
  if(url.origin !== self.location.origin) return;

  // Kader soll sich ohne neuen Service Worker aktualisieren lassen
  if(url.pathname.endsWith('/kader.json')){
    e.respondWith(networkFirst(req, DATEN));
    return;
  }

  // eigene Dateien; Navigationen fallen offline auf die Startseite zurück
  e.respondWith(
    cacheFirst(req, APP).catch(() =>
      req.mode === 'navigate' ? caches.match('./index.html') : Promise.reject()
    )
  );
});
