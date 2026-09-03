/**
 * VULNERABLE - ADVERSARIAL. `Function(...)` called without `new` is the same
 * constructor; a rule that only visits NewExpression never sees it.
 */
export function makeGetter(path) {
  return Function('obj', 'return obj.' + path);
}
