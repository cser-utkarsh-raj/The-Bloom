// Legacy PWA worker retirement.
// The game now ships versioned live assets and must never show a cached old shell.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => /^bloom-/i.test(key))
      .map(key => caches.delete(key)));
    await self.clients.claim();
    await self.registration.unregister();
  })());
});
// Intentionally no fetch handler: all future navigations/assets come from the network.
