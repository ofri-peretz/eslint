/**
 * SAFE (as global pollution) - __proto__ as the FINAL property.
 *
 * Verified: `[[Set]]` on __proto__ invokes the setter and re-parents THIS object
 * only; Object.prototype is untouched. The distinction between this and
 * vulnerable/12 is final vs non-final, and it is the whole predicate.
 */
export function withBase(base) {
  const view = {};
  view.__proto__ = base;
  return view;
}
