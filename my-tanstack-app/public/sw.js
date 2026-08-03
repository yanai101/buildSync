self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// A simple fetch handler is required by browsers to trigger the PWA install prompt.
// We keep it completely empty so it never interferes with real network requests,
// preventing any caching bugs or loops. The browser will handle all fetches natively.
self.addEventListener('fetch', (event) => {
  return;
});

self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      
      const title = data.title || 'התראה חדשה';
      const options = {
        body: data.body || '',
        icon: '/logo.svg',
        badge: '/logo.svg',
        data: data.url || '/',
        vibrate: [200, 100, 200],
        dir: 'rtl',
        ...(data.tag ? { tag: data.tag, renotify: true } : {}),
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      event.waitUntil(
        self.registration.showNotification('התראה חדשה', {
          body: event.data.text(),
          data: '/',
          dir: 'rtl',
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  
  const rawTarget = event.notification && event.notification.data ? event.notification.data : '/';
  const targetUrl = new URL(rawTarget, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      // Reuse an already-open app tab if possible
      for (const client of windowClients) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        
        try {
          if ('focus' in client) await client.focus();
        } catch (e) {
          console.error('Failed to focus client:', e);
        }

        // Notify SPA to route internally — this is sufficient for an already-
        // loaded app tab; no need for client.navigate() which causes a full
        // page reload and re-triggers the auth guard race condition.
        try {
          client.postMessage({ type: 'BS_NAVIGATE', url: rawTarget });
        } catch (e) {
          console.error('Failed to postMessage BS_NAVIGATE:', e);
        }

        return;
      }

      // If no tab is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
