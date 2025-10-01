const CACHE_NAME = 'geo-note-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/vite.svg',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
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
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          if (!res || res.status !== 200 || res.type !== 'basic') return res;
          const responseClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return res;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});
