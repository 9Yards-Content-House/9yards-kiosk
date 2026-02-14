// Service Worker for Push Notifications
// This file should be in the public folder to be served at /sw.js

const CACHE_NAME = '9yards-kitchen-v1';

// Install event - cache basic assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated');
  event.waitUntil(self.clients.claim());
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
    requireInteraction: true, // Keep notification visible
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

  // Open the dashboard or focus existing window
  const urlToOpen = event.notification.data?.url || '/orders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if dashboard is already open
        for (const client of clientList) {
          if (client.url.includes('/orders') || client.url.includes('/kitchen')) {
            return client.focus();
          }
        }
        // Open new window
        return self.clients.openWindow(urlToOpen);
      })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

// Background sync for offline support (optional)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
});

// Message from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
