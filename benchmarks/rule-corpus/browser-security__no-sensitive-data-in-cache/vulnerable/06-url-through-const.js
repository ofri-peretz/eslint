/**
 * VULNERABLE - The URL arrives through a binding.
 */
const PROFILE_URL = '/api/me/private-key';
const cache = await caches.open('api-v1');
await cache.put(PROFILE_URL, response);
