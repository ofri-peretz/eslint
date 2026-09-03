/**
 * SAFE - The sink appears only in a comment.
 */
// cache.addAll(['/api/me/ssn']) would put a regulated identifier on disk.
const cache = await caches.open('app-v1');
await cache.addAll(['/shell.html']);
