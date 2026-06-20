self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A fetch handler is required by browsers to trigger the PWA install prompt.
  // It must stay out of the way of anything it can't serve:
  //  - non-GET requests
  //  - cross-origin requests
  //  - /api/* routes — these can redirect to external services (e.g.
  //    /api/checkout and /api/portal redirect to Polar). If the SW tries to
  //    consume that cross-origin redirect it fails, and because we cache
  //    nothing the fallback resolves to `undefined`, which makes respondWith
  //    throw "network error response: the promise was rejected".
  // For these, we DON'T call respondWith, so the browser handles them natively.
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request).catch(async () => (await caches.match(request)) || Response.error())
  );
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
