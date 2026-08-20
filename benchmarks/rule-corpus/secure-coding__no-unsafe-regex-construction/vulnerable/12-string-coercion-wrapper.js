/**
 * VULNERABLE (adversarial) - Three coercion wrappers around the taint. None of
 * them removes a metacharacter; they only change the node type the rule sees.
 */
export function coercedMatchers(req) {
  return [
    new RegExp(String(req.query.a)),
    new RegExp(req.query.b + ''),
    new RegExp(`${req.query.c}`),
  ];
}
