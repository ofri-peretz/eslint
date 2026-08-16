/**
 * VULNERABLE - ADVERSARIAL. `(0, eval)` is the canonical INDIRECT eval: it runs in
 * global scope rather than the caller's, which is why loaders reach for it.
 */
export function evalGlobal(source) {
  return (0, eval)(source);
}
