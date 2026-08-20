/**
 * VULNERABLE - The fully-qualified spelling of the same global.
 */
export function boot(settings) {
  window.navigator.serviceWorker.register(settings.workerUrl, {
    scope: '/app/',
  });
}
