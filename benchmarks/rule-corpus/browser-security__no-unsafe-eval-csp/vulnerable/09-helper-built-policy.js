/** VULNERABLE - the policy is built by a helper from a directive map. Nothing
 *  at the call site spells the directive; it lives in the data the helper is
 *  handed. */
function buildPolicy(directives) {
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ');
}

export const csp = buildPolicy({
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-eval'"],
});
