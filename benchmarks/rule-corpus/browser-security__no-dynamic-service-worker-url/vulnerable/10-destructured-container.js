/**
 * VULNERABLE - ADVERSARIAL. The container destructured off `navigator` first.
 * `navigator.serviceWorker.register` never appears as one chain.
 */
const { serviceWorker } = navigator;

export function boot(remote) {
  serviceWorker.register(remote.swUrl);
}
