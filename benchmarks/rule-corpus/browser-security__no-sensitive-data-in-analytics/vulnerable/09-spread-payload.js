/**
 * VULNERABLE - ADVERSARIAL. The PII sits alongside a spread. The spread itself
 * is unknowable, but the explicit key next to it is not.
 */
analytics.track('Signup Completed', {
  ...baseProperties,
  emailAddress: user.contact,
});
