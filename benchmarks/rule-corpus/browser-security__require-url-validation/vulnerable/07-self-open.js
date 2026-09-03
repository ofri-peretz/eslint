/**
 * VULNERABLE - `self.open` is `window.open`. A rule that hardcodes the string
 * `window` misses every worker-safe and lint-mandated spelling.
 */
const next = new URL(window.location.href).searchParams.get('next');
self.open(next);
