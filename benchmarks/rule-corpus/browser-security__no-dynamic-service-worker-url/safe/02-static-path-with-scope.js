/**
 * SAFE - A static path with an options object. Only the URL decides.
 */
navigator.serviceWorker.register('/service-worker.js', {
  scope: '/app/',
  updateViaCache: 'none',
});
