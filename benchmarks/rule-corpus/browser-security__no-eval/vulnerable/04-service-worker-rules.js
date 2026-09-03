/**
 * VULNERABLE - A service worker evaluating a routing script it pulled out of the cache.
 * `self` is the global object inside a worker, so `self.eval` is `eval`.
 */
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match('/routing-rules.js').then(async (cached) => {
      const script = await cached.text();
      self.eval(script);
      return fetch(event.request);
    }),
  );
});
