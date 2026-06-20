const CACHE_NAME = 'artisan-quote-cache-v1';
const PRE_CACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png'
];

// Build and install cache
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRE_CACHE_RESOURCES);
    })
  );
});

// Activate cache and purge old cache stores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept fetch network requests
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Exclude API calls or dev server hot updates
  if (url.pathname.startsWith('/api') || url.pathname.includes('hot-update') || url.hostname === 'localhost' && url.port === '3000' && url.pathname.includes('vite')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Fetch in the background to update the cache (Stale-While-Revalidate)
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Silent catch for network errors when offline
        });

      // Return cached version immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    }).catch(() => {
      // Fallback in case of total failure (especially for document navigation)
      if (event.request.headers.get('accept')?.includes('text/html')) {
        return caches.match('/');
      }
    })
  );
});
