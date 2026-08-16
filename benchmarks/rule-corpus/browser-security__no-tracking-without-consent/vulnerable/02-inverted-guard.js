/**
 * VULNERABLE - There IS a consent check and the call is in the WRONG branch.
 * This shape was pinned as acceptable by the rule's own test suite, because
 * any enclosing `if` counted as protection.
 */
if (!hasConsent) {
  analytics.track('Signup Completed');
}
