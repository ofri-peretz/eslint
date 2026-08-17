/** SAFE - the caller picks WHICH pattern, never WHAT. Neither the DoS nor the
 * semantic bypass is reachable, and this is the remediation the rule's own
 * message recommends. */
const PATTERNS = { slug: '^[a-z0-9-]+$', num: '^[0-9]+$' };
export function matcher(req) {
  const p = PATTERNS[req.query.kind];
  if (!p) throw new Error('unknown pattern');
  return new RegExp(p);
}
