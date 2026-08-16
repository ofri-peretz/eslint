/**
 * VULNERABLE - ADVERSARIAL. The `new URL()` bundler idiom with an attacker-chosen
 * BASE. The path argument is a harmless literal; the origin is the payload.
 * A rule that whitelists `new URL(...)` on the strength of its first argument
 * hands the attacker the whole worker.
 */
export function boot(remote) {
  navigator.serviceWorker.register(new URL('./sw.js', remote.cdnOrigin));
}
