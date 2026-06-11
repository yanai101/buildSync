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
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      // Reuse an already-open app tab: focus it and navigate it to the
      // notification's URL instead of piling up new tabs.
      for (const client of windowClients) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        if ('focus' in client) await client.focus();
        if (client.url !== urlToOpen && 'navigate' in client) {
          try {
            await client.navigate(urlToOpen);
          } catch (e) {
            // Some browsers disallow navigating uncontrolled clients.
            if (clients.openWindow) return clients.openWindow(urlToOpen);
          }
        }
        return;
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
