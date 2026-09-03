/**
 * SAFE - The idiomatic spelling, and one an ancestor walk cannot see: the
 * tracking call is a SIBLING of the guard, not inside it.
 */
export function trackSignup(user) {
  if (!hasConsent) return;
  analytics.track('Signup Completed', { plan: user.plan });
}
