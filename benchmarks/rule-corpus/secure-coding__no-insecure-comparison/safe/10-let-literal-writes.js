/**
 * SAFE (adversarial) - `mode` is a `let`, so it is written twice, but BOTH
 * writes are string literals in this file and the right-hand operand is a string
 * literal too. Two strings cannot coerce, so `==` and `===` are the same
 * comparison here - which is exactly the exemption this rule already grants to
 * single-write bindings.
 */
export function describeRender(prefersReducedMotion) {
  let mode = 'animated';
  if (prefersReducedMotion) {
    mode = 'static';
  }
  if (mode == 'static') {
    return { transitions: false };
  }
  return { transitions: true };
}
