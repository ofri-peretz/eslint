/**
 * VULNERABLE - Feature-detecting the container with `?.` does not make the path
 * any less attacker-controlled.
 */
export function boot(remote) {
  navigator.serviceWorker?.register(remote.workerUrl);
}
