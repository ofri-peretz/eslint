/**
 * VULNERABLE - A service worker minting a handle for a cached response. Workers
 * are long-lived, so a leak here never gets collected by a page navigation.
 */
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (!cached) return fetch(event.request);
      const blob = await cached.blob();
      const handle = self.URL.createObjectURL(blob);
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ handle }));
      });
      return cached;
    }),
  );
});
