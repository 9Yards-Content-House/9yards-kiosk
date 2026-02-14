// Service Worker for 9Yards Kiosk & Dashboard
// Handles push notifications, offline support, and background sync

const CACHE_NAME = '9yards-v2';
const OFFLINE_QUEUE_NAME = '9yards-offline-orders';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index-kiosk.html',
  '/index-dashboard.html',
  '/images/logo/9Yards-Food-White-Logo-colored.png',
  '/images/logo/9Yards-Food-Coloured-favicon.jpg',
];

// API routes that should be cached with network-first strategy
const API_CACHE_ROUTES = [
  '/rest/v1/categories',
  '/rest/v1/menu_items',
];

// IndexedDB for offline order queue
function openOrderQueue() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_QUEUE_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function queueOrder(orderData) {
  const db = await openOrderQueue();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('orders', 'readwrite');
    const store = tx.objectStore('orders');
    const request = store.add({
      ...orderData,
      queuedAt: new Date().toISOString(),
      synced: false,
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getQueuedOrders() {
  const db = await openOrderQueue();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('orders', 'readonly');
    const store = tx.objectStore('orders');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.filter(o => !o.synced));
    request.onerror = () => reject(request.error);
  });
}

async function markOrderSynced(id) {
  const db = await openOrderQueue();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('orders', 'readwrite');
    const store = tx.objectStore('orders');
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const order = getRequest.result;
      if (order) {
        order.synced = true;
        store.put(order);
      }
      resolve();
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.filter(url => !url.includes('undefined')));
      })
      .catch(err => console.warn('[SW] Cache addAll failed:', err))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests except for order creation
  if (request.method !== 'GET') {
    // Handle offline order creation
    if (request.url.includes('/rest/v1/orders') && request.method === 'POST') {
      event.respondWith(
        fetch(request.clone())
          .catch(async () => {
            // Network failed - queue the order for later
            const body = await request.clone().json();
            const id = await queueOrder(body);
            console.log('[SW] Order queued for offline sync:', id);
            
            // Return a synthetic response
            return new Response(JSON.stringify({
              id: `offline-${id}`,
              order_number: `9Y-OFFLINE-${id}`,
              status: 'queued',
              offline: true,
              message: 'Order saved offline. Will sync when connection restored.',
            }), {
              status: 202,
              headers: { 'Content-Type': 'application/json' },
            });
          })
      );
      return;
    }
    return;
  }

  // Cache-first for static assets
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset) || url.pathname === asset)) {
    event.respondWith(
      caches.match(request)
        .then(cached => cached || fetch(request))
    );
    return;
  }

  // Network-first for API routes
  if (API_CACHE_ROUTES.some(route => url.pathname.includes(route))) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request);
        })
    );
    return;
  }

  // Default: network first, then cache
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = {
    title: '9Yards Kitchen',
    body: 'You have a new notification',
    icon: '/images/logo/9Yards-Food-Coloured-favicon.jpg',
    badge: '/images/logo/9Yards-Food-Coloured-favicon.jpg',
    tag: 'default',
    data: {}
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || 'order-notification',
        data: payload.data || {}
      };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View Order' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/orders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('/orders') || client.url.includes('/kitchen')) {
            return client.focus();
          }
        }
        return self.clients.openWindow(urlToOpen);
      })
  );
});

// Background sync - sync offline orders when back online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOfflineOrders());
  }
});

async function syncOfflineOrders() {
  const orders = await getQueuedOrders();
  console.log('[SW] Syncing', orders.length, 'offline orders');

  for (const order of orders) {
    try {
      const response = await fetch('/rest/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });

      if (response.ok) {
        await markOrderSynced(order.id);
        console.log('[SW] Order synced:', order.id);
        
        // Notify the user
        self.registration.showNotification('Order Synced', {
          body: `Your offline order has been submitted successfully.`,
          icon: '/images/logo/9Yards-Food-Coloured-favicon.jpg',
        });
      }
    } catch (err) {
      console.error('[SW] Failed to sync order:', order.id, err);
    }
  }
}

// Message from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'SYNC_ORDERS') {
    syncOfflineOrders();
  }
  
  if (event.data?.type === 'GET_QUEUED_COUNT') {
    getQueuedOrders().then(orders => {
      event.source.postMessage({
        type: 'QUEUED_COUNT',
        count: orders.length,
      });
    });
  }
});

// Online event - trigger sync
self.addEventListener('online', () => {
  console.log('[SW] Back online, syncing orders...');
  syncOfflineOrders();
});
