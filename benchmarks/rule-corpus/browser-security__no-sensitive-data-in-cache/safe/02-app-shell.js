/**
 * SAFE - The app shell is exactly what the Cache Storage API is for.
 */
const cache = await caches.open('app-v1');
await cache.addAll(['/shell.html', '/app.js', '/styles.css', '/logo.svg']);
