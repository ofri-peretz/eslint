/**
 * SAFE - An indentation matcher assembled from a configured indent width:
 * `^(?: {2})+`. The outer `+` repeats a group whose inner quantifier is the
 * EXACT bound `{2}`, so each iteration consumes a fixed number of characters
 * and the match is deterministic - linear, not catastrophic.
 *
 * This is the runtime-built counterpart to safe/02: the shape a text matcher
 * flags is `}` followed by `)` followed by `+`, which says nothing about
 * whether the inner quantifier is bounded.
 */
export function createIndentMatcher(indentSize) {
  return new RegExp(`^(?: {${indentSize}})+`);
}
