/**
 * SAFE - A public, unauthenticated API response.
 */
const cache = await caches.open('api-v1');
await cache.put('/api/public/currency-rates', response);
