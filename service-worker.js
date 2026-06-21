// Service Worker — Timbrature C.A.M. Srl
// Permette all'app di funzionare offline e di essere "installabile"
// come una vera app su Android/iOS/Desktop.
//
// STRATEGIA: "prima la rete, poi la cache" per la pagina principale
// (index.html). Così, ogni volta che il dispositivo ha internet, l'app
// scarica sempre l'ultima versione pubblicata. La cache viene usata SOLO
// come riserva quando manca la connessione. Le risorse statiche (icone,
// manifest) restano invece "prima la cache" perché cambiano raramente.
//
// IMPORTANTE: ad ogni aggiornamento di questo file, incrementa il numero
// di versione qui sotto (es. v2 -> v3). Questo forza il browser a
// accorgersi che il service worker è cambiato e a ripulire le cache
// vecchie.

const CACHE_VERSION = 'v2';
const CACHE_NAME = 'timbrature-cam-' + CACHE_VERSION;
const ASSETS_TO_CACHE = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Non intercettare le chiamate verso lo script Google (API timbrature):
  // devono sempre andare in rete o fallire, così la logica di coda offline
  // dentro l'app continua a funzionare come previsto.
  if (url.includes('script.google.com')) {
    return;
  }

  const isPageRequest = event.request.mode === 'navigate'
    || event.request.destination === 'document'
    || url.endsWith('/index.html')
    || url.endsWith('/');

  if (isPageRequest) {
    // PRIMA LA RETE: scarica sempre l'ultima versione se possibile.
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Offline: usa l'ultima copia salvata
        return caches.match(event.request).then((cached) => cached || caches.match('./index.html'));
      })
    );
    return;
  }

  // Tutto il resto (icone, manifest, librerie esterne): prima la cache,
  // così l'app si carica più in fretta e funziona offline.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (event.request.method === 'GET' && response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      }).catch(() => {});
    })
  );
});
