/**
 * VULNERABLE - The credential is in the query string. URL punctuation has to be
 * split before the path can be read as words.
 */
const cache = await caches.open('api-v1');
await cache.add('/api/export?api_key=abc123');
