/**
 * VULNERABLE (wave 2) - The .then callback as a function expression rather than
 * an arrow.
 */
caches.open('api-v1').then(function (cache) {
  cache.put('/api/me/private-key', response);
});
