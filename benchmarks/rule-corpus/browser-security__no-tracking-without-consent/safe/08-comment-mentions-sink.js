/**
 * SAFE - The sink appears only in a comment.
 */
// Do not call analytics.track() before the consent banner resolves.
if (hasConsent) {
  analytics.track('Signup Completed');
}
