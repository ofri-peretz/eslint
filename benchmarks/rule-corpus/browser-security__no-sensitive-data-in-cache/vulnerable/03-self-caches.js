/**
 * VULNERABLE - `self.caches` is the spelling inside a worker, where `window`
 * does not exist.
 */
const cache = await self.caches.open('api-v1');
await cache.add('/account/credit-card');
