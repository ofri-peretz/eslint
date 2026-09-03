/**
 * VULNERABLE - ADVERSARIAL. A guard whose identifier CONTAINS a consent word
 * but decides something else: whether to render the consent banner, not
 * whether consent was given.
 */
if (shouldShowConsentBanner) {
  analytics.page('Consent Banner Shown');
}
