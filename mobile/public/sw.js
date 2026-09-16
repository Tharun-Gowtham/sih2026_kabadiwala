/**
 * Kabadiwala Connect — PWA Service Worker (Offline Cache Engine)
 * Implements Cache-First with Dynamic Network Fallback
 * Ensures the app boots up and operates with 0 signal / Airplane Mode on Android devices.
 */

const CACHE_NAME = 'kabadiwala-lite-v4';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/kabadiwala-lite.html',
  '/dealer.html',
  '/manifest.json',
  '/icon.svg',
  '/src/css/main.css',
  '/src/css/components.css',
  '/src/css/collector.css',
  '/src/css/dealer.css',
  '/src/css/animations.css',
  '/src/js/collector-app.js',
  '/src/js/utils.js',
  '/src/js/i18n.js',
  '/src/js/geo.js',
  '/src/js/sync.js',
  '/src/js/db.js',
  '/src/js/api.js',
  '/src/js/ml-classifier.js',
  '/src/js/views/collector-lite.js',
  '/src/js/views/price-board.js',
  '/src/js/views/collector-ledger.js',
  '/src/js/views/collector-recyclers.js'
];

// 1. Install Event — Pre-cache critical application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core application shell for offline use');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Some precache items skipped, will cache dynamically:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event — Clean old cache generations
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Clearing deprecated cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event — Cache-First with Network Fallback & Dynamic Cache Update
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Don't intercept non-GET or cross-origin requests
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Exclude backend API requests from static caching
  if (url.pathname.startsWith('/api')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version immediately
        // In background, fetch and refresh cache if online (stale-while-revalidate for JS/CSS)
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {
          // Offline, perfectly fine
        });

        return cachedResponse;
      }

      // Not in cache, fetch from network and cache it dynamically
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Network failed (device is offline)
        // If navigating to an HTML page, return cached kabadiwala-lite.html
        if (request.mode === 'navigate') {
          return caches.match('/kabadiwala-lite.html') || caches.match('/index.html');
        }
      });
    })
  );
});
