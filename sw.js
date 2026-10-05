// Service Worker for THE BLOOM - PWA support
// Game code must not be pinned to an old cache: stale JS can load an older
// level layout/objective system and make the game appear "broken" on another PC.
const CACHE_NAME = 'bloom-v4';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/favicon.svg',
  '/logo.svg',
  '/manifest.json'
];

const GAME_PREFIX = '/js/';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never serve cached JavaScript for the game. Always ask the server first;
  // fall back to the cache only when offline.
  if (url.origin === self.location.origin && url.pathname.startsWith(GAME_PREFIX)) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.ok) return response;
          throw new Error('Game asset request failed: ' + response.status);
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Network-first for navigation so deployed index.html is never pinned.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.ok) return response;
          throw new Error('Navigation request failed: ' + response.status);
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first only for stable static assets.
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});
