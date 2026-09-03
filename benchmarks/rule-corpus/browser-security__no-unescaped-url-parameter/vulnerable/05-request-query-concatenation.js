/**
 * VULNERABLE - Server-side render helper. Concatenation rather than a template,
 * and the untrusted operand is in TRAILING position — which the origin-taint
 * helper deliberately ignores and this rule must not.
 */
export function upstreamUrl(req) {
  return 'https://internal.example.com/v1/report?filter=' + req.query.filter;
}
