/**
 * SAFE - The sink appears only in a comment.
 */
// Never navigator.serviceWorker.register(config.swUrl) — the path must be built in.
export function boot() {
  navigator.serviceWorker.register('/sw.js');
}
