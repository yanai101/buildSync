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
          dir: 'rtl',
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  
  // This is the magic line that opens the specific URL!
  const urlToOpen = new URL(event.notification.data || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      // Reuse an already-open app tab if possible
      for (const client of windowClients) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        if ('focus' in client) await client.focus();
        if (client.url !== urlToOpen && 'navigate' in client) {
          try {
            await client.navigate(urlToOpen);
          } catch (e) {
            if (clients.openWindow) return clients.openWindow(urlToOpen);
          }
        }
        return;
      }
      // If no tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
