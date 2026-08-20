/**
 * SAFE - An optional call on a user-supplied transform. Same syntax as the
 * optional-chained evaluator, different receiver — the receiver is the evidence.
 */
export function normalize(value, options) {
  return options.transform?.(value) ?? value;
}
