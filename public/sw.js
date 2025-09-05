// Service Worker for Push Notifications
const CACHE_NAME = 'whats-the-move-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'New Notification', body: event.data.text() };
    }
  }

  const options = {
    title: data.title || "What's the Move?",
    body: data.body || 'New event notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: data,
    actions: [
      {
        action: 'view',
        title: 'View Event',
        icon: '/favicon.ico'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ],
    requireInteraction: false,
    renotify: false,
    tag: data.tag || 'default'
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Handle notification click (navigate to app)
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Check if app is already open
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      
      // Open new window if app not already open
      const urlToOpen = event.notification.data?.url || '/';
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
  }
});