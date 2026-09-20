const CACHE_NAME = 'kabadiwala-ml-v7';
const MODEL_CACHE_NAME = 'kabadiwala-model-v7';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/kabadiwala-lite.html',
  '/dealer.html'
];

const MODEL_ASSETS = [
  '/models/ewaste_model/ewaste_model_dynamic.tflite',
  '/models/ewaste_model/ewaste_model_float16.tflite',
  '/models/ewaste_model/labels.json',
  '/models/ewaste_model/category_map.json'
];

const ALL_ASSETS = [...STATIC_ASSETS, ...MODEL_ASSETS];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== MODEL_CACHE_NAME)
          .map((name) => {
            console.log('[SW] Evicting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

async function fetchWithCache(cacheName, request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Vite HMR and dynamic code should always be network-first
  if (url.pathname.startsWith('/src/') || url.pathname.includes('@vite') || url.pathname.includes('node_modules')) {
    return;
  }

  // HTML navigation requests should be Network-First with Cache-Fallback
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(event.request);
          if (cached) return cached;
          return caches.match('/kabadiwala-lite.html');
        })
    );
    return;
  }

  if (url.pathname.startsWith('/models/ewaste_model/')) {
    event.respondWith(fetchWithCache(MODEL_CACHE_NAME, event.request));
    return;
  }

  if (event.request.method === 'GET') {
    event.respondWith(fetchWithCache(CACHE_NAME, event.request));
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'getCacheStatus') {
    Promise.all([
      caches.open(CACHE_NAME).then(c => c.keys()),
      caches.open(MODEL_CACHE_NAME).then(c => c.keys())
    ]).then(([staticKeys, modelKeys]) => {
      event.ports[0].postMessage({
        static: staticKeys.map(r => r.url),
        model: modelKeys.map(r => r.url)
      });
    });
  }
});

console.log('[SW] Service Worker loaded');