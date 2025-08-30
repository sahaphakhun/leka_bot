// Minimal dashboard-scoped Service Worker
self.addEventListener('install', (event) => {
  // Activate immediately for simplicity
  // @ts-ignore
  self.skipWaiting && self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // @ts-ignore
  self.clients && self.clients.claim && self.clients.claim();
});

// No caching by default; pass-through fetch
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
