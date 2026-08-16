/**
 * SAFE - ADVERSARIAL. A payload built elsewhere and handed over as a binding.
 * The rule cannot see inside it and must not pretend to.
 */
const properties = buildAnalyticsPayload(user);
analytics.track('Signup Completed', properties);
