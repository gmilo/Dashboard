// Minimal SW to satisfy PWA install criteria.
// You can replace this with Workbox/next-pwa later.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // network-first passthrough for now
});

