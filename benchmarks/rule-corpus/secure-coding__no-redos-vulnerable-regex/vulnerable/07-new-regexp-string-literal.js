/**
 * VULNERABLE - The same pattern a `/.../` literal would carry, written through
 * the `new RegExp("...")` constructor because the flags are computed. The
 * string form is every bit as analysable as the literal form; a rule that only
 * reads literals has a blind spot the size of half the ecosystem.
 */
export function buildTagMatcher(caseInsensitive) {
  return new RegExp('^(\\w+\\s?)*$', caseInsensitive ? 'i' : '');
}
