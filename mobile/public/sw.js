const CACHE_NAME = 'kabadiwala-ml-v1';
const MODEL_CACHE_NAME = 'kabadiwala-model-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/kabadiwala-lite.html',
  '/dealer.html',
  '/tf-tflite.min.js'
];

const MODEL_ASSETS = [
  '/models/ewaste_model/ewaste_model_dynamic.tflite',
  '/models/ewaste_model/ewaste_model_float16.tflite',
  '/models/ewaste_model/labels.json',
  '/models/ewaste_model/category_map.json',
  '/models/yolo/yolov8m.onnx'
];

const ALL_ASSETS = [...STATIC_ASSETS, ...MODEL_ASSETS];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch(err => {
          console.warn('[SW] Some static assets failed to cache:', err);
        });
      }),
      caches.open(MODEL_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching model assets');
        return cache.addAll(MODEL_ASSETS).catch(err => {
          console.warn('[SW] Some model assets failed to cache:', err);
        });
      })
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== MODEL_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

async function fetchWithCache(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Serving from cache:', request.url);
    return cachedResponse;
  }

  try {
    console.log('[SW] Fetching from network:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (err) {
    console.error('[SW] Network fetch failed:', request.url, err);
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
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