/**
 * VULNERABLE (wave 2) - The cache NAME through a binding; the Cache itself is
 * still a caches.open() result.
 */
const CACHE = 'api-v1';
const cache = await caches.open(CACHE);
await cache.put('/api/me/ssn', response);
