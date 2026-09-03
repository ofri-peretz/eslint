/**
 * VULNERABLE - The awaited form, which is what most modern service workers use.
 */
const cache = await caches.open('api-v1');
await cache.put('/api/session/token', response);
