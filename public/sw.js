// Service Worker for Steady — M3 PWA
// Strategies:
//   - App shell: precache on install
//   - Navigation: network-first → cache → offline page
//   - Static assets (JS/CSS/fonts): stale-while-revalidate
//   - Images: cache-first

const CACHE_VERSION = 'steady-v2'
const APP_SHELL = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => {}) // Don't fail install if some assets 404
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_VERSION)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Skip cross-origin (except Google Fonts for Material Symbols)
  const isSameOrigin = url.origin === self.location.origin
  const isGoogleFonts = url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com'

  if (!isSameOrigin && !isGoogleFonts) return

  // Navigation requests: network-first → cache → offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() =>
          caches.match(request).then((r) => r || caches.match('/offline.html'))
        )
    )
    return
  }

  // Google Fonts: stale-while-revalidate
  if (isGoogleFonts) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
          }
          return response
        }).catch(() => cached)
        return cached || fetchPromise
      })
    )
    return
  }

  // Static assets (JS, CSS, images): stale-while-revalidate
  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok || response.type === 'opaque') {
            const copy = response.clone()
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
          }
          return response
        }).catch(() => cached)
        return cached || fetchPromise
      })
    )
    return
  }

  // Default: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})

// Handle messages from the page (e.g., skipWaiting for updates)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
