const CACHE_NAME = 'yearly-tracker-v8';
const OFFLINE_URL = './offline.html';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './offline.html'
];

// Google Fonts CSS + woff2 files (so the offline app keeps its typography)
const FONT_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Epilogue:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap'
];

// Install: pre-cache shell assets + font CSS
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)),
      // Best-effort font caching — don't fail install if fonts can't be fetched
      caches.open(CACHE_NAME).then((cache) =>
        Promise.allSettled(FONT_ASSETS.map((url) => cache.add(url)))
      )
    ]).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches and notify clients of updates
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      )
    ).then(() =>
      // Notify all clients that a new SW has taken control — they can show a
      // "refresh to update" toast.
      self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
      })
    ).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate with offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Strategy for Navigation requests (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() =>
          caches.match(event.request)
            .then((cachedResponse) => cachedResponse || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Strategy for Assets (CSS, JS, Fonts, Images) — Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // Cache valid same-origin responses + Google Fonts (cross-origin but ok)
          const isSameOrigin = url.origin === self.location.origin;
          const isGoogleFont = url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com';
          if (networkResponse.ok && (isSameOrigin || isGoogleFont)) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});

// Allow page to trigger immediate SW activation
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
