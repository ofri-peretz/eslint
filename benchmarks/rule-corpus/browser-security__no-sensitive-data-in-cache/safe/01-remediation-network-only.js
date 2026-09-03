/**
 * SAFE - The remediation. Authenticated routes are served network-only and
 * never enter the cache.
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(caches.match(event.request));
});
