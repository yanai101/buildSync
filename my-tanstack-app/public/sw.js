self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A simple fetch handler is required by browsers to trigger the PWA installation prompt
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      
      const title = data.title || 'התראה חדשה';
      const options = {
        body: data.body || '',
        icon: '/logo.png',
        badge: '/logo.png',
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
  
  const urlToOpen = new URL(event.notification.data || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
