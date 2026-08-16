/**
 * VULNERABLE - Computed method access on a proven Cache.
 */
const cache = await caches.open('api-v1');
await cache['put']('/api/me/api-key', response);
