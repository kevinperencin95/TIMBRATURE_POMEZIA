// Service Worker — Timbrature C.A.M. Srl
// Permette all'app di funzionare offline e di essere "installabile"
// come una vera app su Android/iOS/Desktop.

const CACHE_NAME = 'timbrature-cam-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

// Installazione: salva i file principali nella cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Attivazione: rimuove vecchie versioni della cache
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

// Richieste: serve dalla cache se offline, altrimenti dalla rete
// (le chiamate verso Google Apps Script per le timbrature NON vengono
// mai messe in cache: devono sempre andare in rete o fallire, così la
// logica di coda offline dentro l'app continua a funzionare come prima)
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Non intercettare le chiamate verso lo script Google (API timbrature)
  if (url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // salva una copia in cache per il prossimo uso offline
        if (event.request.method === 'GET' && response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      }).catch(() => {
        // se sei offline e la risorsa non è in cache, mostra almeno la pagina principale
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
