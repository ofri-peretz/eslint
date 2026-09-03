/**
 * VULNERABLE - The path is laundered through a helper before registration.
 */
function workerPath(profile) {
  return profile.experimental ? profile.swOverride : '/sw.js';
}

export function boot(profile) {
  navigator.serviceWorker.register(workerPath(profile));
}
