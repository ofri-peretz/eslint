/**
 * SAFE - The CORRECT remediation: the tracker is only reached when consent was
 * granted.
 */
if (hasConsent) {
  analytics.track('Signup Completed');
}
