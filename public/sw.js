// public/sw.js - ADVANCED Service Worker for Ultimate Performance

const CACHE_NAME = 'animuse-v1.0.0';
const CRITICAL_CACHE = 'critical-v1.0.0';
const IMAGE_CACHE = 'images-v1.0.0';
const API_CACHE = 'api-v1.0.0';

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  CACHE_ONLY: 'cache-only',
  NETWORK_ONLY: 'network-only'
};

// Critical resources for instant loading
const CRITICAL_RESOURCES = [
  '/',
  '/src/main.tsx',
  '/src/index.css',
  '/src/App.tsx',
  '/index.html'
];

// Pre-cache anime poster patterns
const ANIME_IMAGE_PATTERNS = [
  /myanimelist\.net.*\.(jpg|jpeg|png|webp)/i,
  /anilist\.co.*\.(jpg|jpeg|png|webp)/i,
  /imgur\.com.*\.(jpg|jpeg|png|webp)/i
];

// API endpoints to cache
const API_PATTERNS = [
  /\/api\/anime/,
  /\/api\/characters/,
  /\/api\/reviews/,
  /convex.*query/
];

// =====================================
// INSTALLATION & ACTIVATION
// =====================================

self.addEventListener('install', (event) => {
  console.log('🚀 AnimeMuseAI Service Worker installing...');
  
  event.waitUntil(
    caches.open(CRITICAL_CACHE)
      .then((cache) => {
        console.log('📦 Caching critical resources');
        return cache.addAll(CRITICAL_RESOURCES);
      })
      .then(() => {
        console.log('✅ Critical resources cached');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('🔄 AnimeMuseAI Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== CRITICAL_CACHE && 
                cacheName !== IMAGE_CACHE && 
                cacheName !== API_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// =====================================
// FETCH INTERCEPTION & CACHING
// =====================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Critical resources - Cache First
  if (CRITICAL_RESOURCES.some(resource => url.pathname.includes(resource))) {
    event.respondWith(cacheFirst(request, CRITICAL_CACHE));
    return;
  }

  // Anime images - Stale While Revalidate with WebP optimization
  if (ANIME_IMAGE_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(optimizedImageFetch(request));
    return;
  }

  // API calls - Network First with intelligent caching
  if (API_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(intelligentAPICache(request));
    return;
  }

  // Static assets - Cache First
  if (url.pathname.match(/\.(js|css|woff2|woff|ttf)$/)) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // Default - Network First
  event.respondWith(networkFirst(request, CACHE_NAME));
});

// =====================================
// CACHING STRATEGIES
// =====================================

async function cacheFirst(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Background update for freshness
      updateCacheInBackground(request, cacheName);
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache-first strategy failed:', error);
    return new Response('Offline content unavailable', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network failed, falling back to cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || await fetchPromise;
}

// =====================================
// OPTIMIZED IMAGE HANDLING
// =====================================

async function optimizedImageFetch(request) {
  const url = new URL(request.url);
  
  // Check for WebP support and optimize
  const acceptsWebP = request.headers.get('accept')?.includes('image/webp');
  
  if (acceptsWebP && !url.searchParams.has('format')) {
    // Try to get WebP version
    const webpUrl = new URL(request.url);
    webpUrl.searchParams.set('format', 'webp');
    webpUrl.searchParams.set('q', '85'); // Quality optimization
    
    try {
      const webpRequest = new Request(webpUrl.toString(), {
        headers: request.headers,
        mode: request.mode,
        credentials: request.credentials
      });
      
      return await staleWhileRevalidate(webpRequest, IMAGE_CACHE);
    } catch (error) {
      console.log('WebP optimization failed, fallback to original');
    }
  }

  return await staleWhileRevalidate(request, IMAGE_CACHE);
}

// =====================================
// INTELLIGENT API CACHING
// =====================================

async function intelligentAPICache(request) {
  const url = new URL(request.url);
  
  // Determine cache TTL based on endpoint
  let ttl = 5 * 60 * 1000; // 5 minutes default
  
  if (url.pathname.includes('/anime/popular')) {
    ttl = 30 * 60 * 1000; // 30 minutes for popular anime
  } else if (url.pathname.includes('/characters')) {
    ttl = 60 * 60 * 1000; // 1 hour for character data
  } else if (url.pathname.includes('/reviews')) {
    ttl = 2 * 60 * 1000; // 2 minutes for reviews (more dynamic)
  }

  try {
    // Check cache with TTL
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      const cachedDate = new Date(cachedResponse.headers.get('sw-cached-date'));
      const now = new Date();
      
      if (now - cachedDate < ttl) {
        // Cache is fresh, but still update in background
        updateCacheInBackground(request, API_CACHE);
        return cachedResponse;
      }
    }

    // Fetch fresh data
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      const headers = new Headers(responseClone.headers);
      headers.set('sw-cached-date', new Date().toISOString());
      
      const cache = await caches.open(API_CACHE);
      const cachedResponse = new Response(await responseClone.blob(), {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers
      });
      
      cache.put(request, cachedResponse);
    }
    return networkResponse;
  } catch (error) {
    console.log('API network failed, using cache:', error);
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('{"error":"Offline"}', {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// =====================================
// BACKGROUND UPDATES
// =====================================

async function updateCacheInBackground(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    console.log('Background update failed:', error);
  }
}

// =====================================
// BACKGROUND SYNC
// =====================================

self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Sync offline actions
    const syncData = await getStoredSyncData();
    
    for (const item of syncData) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body
        });
        
        // Remove from sync queue on success
        await removeSyncData(item.id);
      } catch (error) {
        console.log('Sync failed for item:', item.id, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// =====================================
// PUSH NOTIFICATIONS
// =====================================

self.addEventListener('push', (event) => {
  console.log('📬 Push notification received');
  
  const options = {
    body: 'New anime recommendations available!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore',
        icon: '/action-explore.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/action-close.png'
      }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.data = { ...options.data, ...data };
  }

  event.waitUntil(
    self.registration.showNotification('AnimeMuseAI', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/?from=notification')
    );
  }
});

// =====================================
// PERFORMANCE MONITORING
// =====================================

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PERFORMANCE_METRICS') {
    // Store performance metrics for analysis
    storePerformanceMetrics(event.data.metrics);
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    getCacheStats().then(stats => {
      event.ports[0].postMessage(stats);
    });
  }
});

async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = {
      size: keys.length,
      entries: keys.map(request => request.url)
    };
  }
  
  return stats;
}

// =====================================
// UTILITY FUNCTIONS
// =====================================

async function getStoredSyncData() {
  // In a real implementation, this would read from IndexedDB
  return [];
}

async function removeSyncData(id) {
  // In a real implementation, this would remove from IndexedDB
}

async function storePerformanceMetrics(metrics) {
  // In a real implementation, this would store in IndexedDB
  console.log('📊 Performance metrics:', metrics);
}

console.log('🚀 AnimeMuseAI Service Worker loaded successfully!'); 