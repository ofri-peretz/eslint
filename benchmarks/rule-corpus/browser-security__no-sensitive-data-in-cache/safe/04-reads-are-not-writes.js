/**
 * SAFE - match/keys/delete read the cache. Only put/add/addAll write it.
 */
const cache = await caches.open('api-v1');
await cache.match('/api/me/ssn');
await cache.delete('/api/me/ssn');
