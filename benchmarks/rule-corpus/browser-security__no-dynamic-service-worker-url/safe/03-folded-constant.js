/**
 * SAFE - A module constant. Extracting a literal into a `const` is what every
 * style guide asks for; it does not make the value attacker-influenced.
 */
const SW_URL = '/service-worker.js';

export function boot() {
  navigator.serviceWorker.register(SW_URL);
}
