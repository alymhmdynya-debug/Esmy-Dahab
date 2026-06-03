const CACHE_NAME = 'esm-dahab-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/icons/stage1.png',
  '/icons/stage2.png',
  '/icons/stage3.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests or Firebase API/Auth operations
  if (
    event.request.method !== 'GET' || 
    event.request.url.includes('firestore') || 
    event.request.url.includes('firebase') || 
    event.request.url.includes('googleapis') ||
    event.request.url.includes('imgbb')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Dynamic fallback for routing (SPA dynamic parameter routing)
      if (event.request.mode === 'navigate') {
        return fetch(event.request).catch(() => {
          return caches.match('/index.html') || caches.match('/');
        });
      }

      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise || fetch('/');
    })
  );
});

// Handle custom level updates dynamically
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'STAGE_LEVEL_UPDATE') {
    const { level, iconUrl, manifestUrl } = event.data;
    console.log(`[Service Worker] User tier updated. Level: ${level}, Icon: ${iconUrl}, Manifest: ${manifestUrl}`);
    
    // We can precache the updated icon and manifest dynamically
    caches.open(CACHE_NAME).then((cache) => {
      cache.add(iconUrl).catch(e => console.warn('[SW] Failed to cache iconUrl:', e));
      if (manifestUrl) {
        cache.add(manifestUrl).catch(e => console.warn('[SW] Failed to cache manifestUrl:', e));
      }
    });

    // Notify other windows/clients if applicable
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        if (client.id !== event.source.id) {
          client.postMessage({
            type: 'TIER_SYNCED',
            level: level
          });
        }
      });
    });
  }
});

