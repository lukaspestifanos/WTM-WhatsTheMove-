// Service Worker for Push Notifications - What's the Move
const CACHE_NAME = 'whats-the-move-v1';
const STATIC_CACHE_NAME = 'whats-the-move-static-v1';

// Assets to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  // Add other critical assets here
];

// Configuration
const CONFIG = {
  defaultIcon: '/favicon.ico',
  defaultBadge: '/favicon.ico',
  defaultTitle: "What's the Move?",
  defaultBody: 'New event notification',
  notificationTimeout: 10000, // 10 seconds
  maxNotifications: 5,
};

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);

  event.waitUntil(handlePushNotification(event));
});

// Handle push notification
async function handlePushNotification(event) {
  try {
    let data = {};

    // Parse notification data
    if (event.data) {
      try {
        data = event.data.json();
      } catch (parseError) {
        console.warn('[SW] Failed to parse push data as JSON:', parseError);
        data = { 
          title: CONFIG.defaultTitle, 
          body: event.data.text() || CONFIG.defaultBody 
        };
      }
    }

    // Validate and sanitize data
    const notificationData = sanitizeNotificationData(data);

    // Create notification options
    const options = createNotificationOptions(notificationData);

    // Check if we should show the notification
    if (await shouldShowNotification(notificationData)) {
      await self.registration.showNotification(options.title, options);
      console.log('[SW] Notification displayed:', options.title);
    } else {
      console.log('[SW] Notification suppressed due to policy');
    }

  } catch (error) {
    console.error('[SW] Error handling push notification:', error);

    // Fallback notification for errors
    await self.registration.showNotification(CONFIG.defaultTitle, {
      body: 'New notification (error occurred)',
      icon: CONFIG.defaultIcon,
      badge: CONFIG.defaultBadge,
      tag: 'error-fallback',
      requireInteraction: false,
    });
  }
}

// Sanitize notification data to prevent XSS and ensure valid values
function sanitizeNotificationData(data) {
  const sanitized = {
    title: sanitizeText(data.title) || CONFIG.defaultTitle,
    body: sanitizeText(data.body) || CONFIG.defaultBody,
    icon: sanitizeUrl(data.icon) || CONFIG.defaultIcon,
    badge: sanitizeUrl(data.badge) || CONFIG.defaultBadge,
    url: sanitizeUrl(data.url) || '/',
    tag: sanitizeText(data.tag) || 'default',
    eventId: sanitizeText(data.eventId),
    type: sanitizeText(data.type) || 'general',
    timestamp: data.timestamp || Date.now(),
  };

  return sanitized;
}

// Sanitize text to prevent XSS
function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/<[^>]*>/g, '').trim().substring(0, 500);
}

// Sanitize URLs to prevent malicious redirects
function sanitizeUrl(url) {
  if (typeof url !== 'string') return '';
  try {
    const urlObj = new URL(url, self.location.origin);
    // Only allow same-origin URLs and common icon formats
    if (urlObj.origin === self.location.origin || 
        url.startsWith('/') || 
        url.match(/\.(ico|png|jpg|jpeg|svg)$/i)) {
      return urlObj.href;
    }
  } catch (e) {
    console.warn('[SW] Invalid URL provided:', url);
  }
  return '';
}

// Create notification options with proper structure
function createNotificationOptions(data) {
  const actions = [];

  // Add view action for event notifications
  if (data.eventId || data.type === 'event') {
    actions.push({
      action: 'view',
      title: 'View Event',
      icon: data.icon
    });
  }

  // Always include close action
  actions.push({
    action: 'close',
    title: 'Dismiss'
  });

  return {
    title: data.title,
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: {
      url: data.url,
      eventId: data.eventId,
      type: data.type,
      timestamp: data.timestamp
    },
    actions: actions,
    requireInteraction: data.type === 'urgent' || data.type === 'reminder',
    renotify: false,
    tag: data.tag,
    timestamp: data.timestamp,
    vibrate: data.type === 'urgent' ? [200, 100, 200] : [200],
    silent: data.type === 'silent' || false,
  };
}

// Check if notification should be shown (rate limiting, duplicates, etc.)
async function shouldShowNotification(data) {
  try {
    // Get existing notifications
    const notifications = await self.registration.getNotifications();

    // Check for duplicate notifications with same tag
    const duplicate = notifications.find(n => n.tag === data.tag && n.tag !== 'default');
    if (duplicate) {
      console.log('[SW] Duplicate notification suppressed:', data.tag);
      return false;
    }

    // Limit total number of notifications
    if (notifications.length >= CONFIG.maxNotifications) {
      console.log('[SW] Too many notifications, closing oldest');
      // Close oldest notification
      notifications[0]?.close();
    }

    // Check if user is currently active (optional - might want to suppress if user is active)
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const activeClient = clients.find(client => client.visibilityState === 'visible');

    // Show notification even if user is active (you can change this logic)
    return true;

  } catch (error) {
    console.error('[SW] Error checking notification policy:', error);
    return true; // Default to showing notification on error
  }
}

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  // Handle close action
  if (event.action === 'close') {
    return;
  }

  event.waitUntil(handleNotificationClick(event));
});

// Handle notification click
async function handleNotificationClick(event) {
  try {
    const data = event.notification.data || {};
    const urlToOpen = determineUrlToOpen(event, data);

    // Find existing window or open new one
    const clients = await self.clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    });

    // Check if app is already open
    for (const client of clients) {
      if (client.url.includes(self.location.origin)) {
        // Focus existing window and navigate if needed
        if (urlToOpen !== '/') {
          client.navigate(urlToOpen);
        }
        return client.focus();
      }
    }

    // Open new window if app not already open
    console.log('[SW] Opening new window:', urlToOpen);
    return self.clients.openWindow(urlToOpen);

  } catch (error) {
    console.error('[SW] Error handling notification click:', error);
    // Fallback to opening home page
    return self.clients.openWindow('/');
  }
}

// Determine which URL to open based on notification data
function determineUrlToOpen(event, data) {
  // Handle specific actions
  if (event.action === 'view' && data.eventId) {
    return `/events/${data.eventId}`;
  }

  // Use URL from notification data
  if (data.url && data.url !== '/') {
    return data.url;
  }

  // Default to home page
  return '/';
}

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

// Handle background sync
async function handleBackgroundSync() {
  try {
    console.log('[SW] Performing background sync...');

    // Check if we have network connectivity
    if (!navigator.onLine) {
      console.log('[SW] No network available for background sync');
      return;
    }

    // Perform sync operations (you can implement specific sync logic here)
    // For example: sync pending RSVPs, comments, etc.

    console.log('[SW] Background sync completed');

  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error; // Will reschedule the sync
  }
}

// Fetch event for offline functionality
self.addEventListener('fetch', (event) => {
  // Only handle same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip caching for API requests and POST requests
  if (event.request.url.includes('/api/') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(handleFetch(event.request));
});

// Handle fetch with cache-first strategy for static assets
async function handleFetch(request) {
  try {
    // Try cache first for static assets
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // Return cached version and update cache in background
      updateCacheInBackground(request);
      return cachedResponse;
    }

    // If not in cache, fetch from network
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;

  } catch (error) {
    console.error('[SW] Fetch failed:', error);

    // Return offline fallback if available
    return caches.match('/offline.html') || new Response('Offline', { status: 503 });
  }
}

// Update cache in background
async function updateCacheInBackground(request) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response);
    }
  } catch (error) {
    // Silently fail background updates
    console.log('[SW] Background cache update failed:', error.message);
  }
}

// Message event for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Error handler
self.addEventListener('error', (event) => {
  console.error('[SW] Service worker error:', event.error);
});

// Unhandled rejection handler
self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service worker loaded successfully');