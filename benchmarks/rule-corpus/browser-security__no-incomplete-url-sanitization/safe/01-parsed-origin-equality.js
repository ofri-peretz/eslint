/**
 * SAFE - The URL is PARSED and its origin compared for equality. This is the
 * remediation, and a rule that reported it would be reporting its own fix.
 */
export function isSafe(returnUrl) {
  return new URL(returnUrl, location.origin).origin === location.origin;
}
