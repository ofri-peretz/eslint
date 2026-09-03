/**
 * VULNERABLE (wave 2) - An absolute URL rather than a path.
 */
const cache = await caches.open('api-v1');
await cache.add('https://app.example.com/api/session/token');
