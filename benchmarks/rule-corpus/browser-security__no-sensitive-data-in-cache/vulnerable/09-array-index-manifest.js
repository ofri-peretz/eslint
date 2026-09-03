/**
 * VULNERABLE - One entry of a precache manifest, reached as an array element.
 */
const cache = await caches.open('app-v1');
await cache.addAll(['/shell.html', '/api/user/credentials']);
