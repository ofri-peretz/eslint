/**
 * VULNERABLE - No binding at all; the Cache is the awaited call itself.
 */
(await caches.open('api-v1')).add('/api/session');
