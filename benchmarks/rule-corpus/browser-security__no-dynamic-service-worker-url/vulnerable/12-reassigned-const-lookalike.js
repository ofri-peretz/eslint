/**
 * VULNERABLE - ADVERSARIAL. The binding LOOKS folded — it is declared with a
 * static literal — but it is written again before use. Constant folding that
 * ignores later writes reads this as `/sw.js`.
 */
let workerUrl = '/sw.js';

export function boot(remote) {
  workerUrl = remote.swOverride;
  navigator.serviceWorker.register(workerUrl);
}
