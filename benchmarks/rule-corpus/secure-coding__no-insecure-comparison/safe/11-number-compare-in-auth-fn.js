/**
 * SAFE (adversarial) - The enclosing function is named `authorizeRequest`, which
 * is honest: it does authorise requests. The comparison inside it is a NUMBER
 * against a NUMBER LITERAL while counting how many scopes were granted. You
 * cannot learn a secret by discovering how long it took to compare `2` to `2`.
 */
export function authorizeRequest(grantedScopes, requiredScopes) {
  const matched = requiredScopes.filter((value) => grantedScopes.indexOf(value) !== -1);
  if (matched.length === requiredScopes.length) {
    return { allowed: true, matched: matched.length };
  }
  return { allowed: false, matched: matched.length };
}
