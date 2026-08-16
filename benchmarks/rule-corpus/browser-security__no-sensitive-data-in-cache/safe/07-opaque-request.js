/**
 * SAFE - The request comes from a fetch event; nothing about it is knowable
 * statically, so abstaining is correct.
 */
self.addEventListener('fetch', async (event) => {
  const cache = await caches.open('app-v1');
  await cache.put(event.request, await fetch(event.request));
});
