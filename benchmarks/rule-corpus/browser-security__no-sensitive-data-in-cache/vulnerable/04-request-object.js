/**
 * VULNERABLE - A Request built from a literal URL is the same resource.
 */
const cache = await caches.open('api-v1');
await cache.put(new Request('/api/me/password'), response);
