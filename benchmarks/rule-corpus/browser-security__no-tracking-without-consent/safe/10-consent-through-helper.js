/**
 * SAFE - The consent state arrives through a call. `mentionsConsent` walks the
 * callee, so `hasAnalyticsConsent()` gates as well as a bare flag would.
 */
if (hasAnalyticsConsent()) {
  analytics.track('Signup Completed');
}
