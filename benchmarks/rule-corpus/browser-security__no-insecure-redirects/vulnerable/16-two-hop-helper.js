/**
 * VULNERABLE - ADVERSARIAL. The destination arrives through a local helper
 * that returns its argument unchanged, then through a binding. Two hops, no
 * constraint anywhere on the path.
 */
function normalize(value) {
  return value;
}
const raw = new URLSearchParams(location.search).get('next');
const next = normalize(raw);
window.location.assign(next);
