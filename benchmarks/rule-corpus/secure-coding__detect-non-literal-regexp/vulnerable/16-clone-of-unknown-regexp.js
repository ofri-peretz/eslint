/**
 * VULNERABLE - A "clone" whose receiver this file never sees.
 *
 * Structurally this is mongoose's `cloneRegExp`, and it was exempt for exactly
 * one day. An adversarial wave killed the reasoning: any object may carry
 * `.source` and `.flags`, so the shape cannot tell a compiled RegExp from
 * parsed request data.
 *
 *     const o = JSON.parse(body);
 *     new RegExp(o.source, o.flags);     // identical shape, attacker-chosen
 *
 * The rule's own message is what settles it — it reports that the pattern's
 * cost and origin are not visible here, and the origin of `regexp.source`, for
 * a `regexp` this file never sees, is exactly that.
 */
export function cloneRegExp(regexp) {
  const ret = new RegExp(regexp.source, regexp.flags);
  ret.lastIndex = regexp.lastIndex;
  return ret;
}
