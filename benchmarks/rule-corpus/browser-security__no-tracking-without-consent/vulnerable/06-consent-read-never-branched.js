/**
 * VULNERABLE - The consent flag is READ and then not used to decide anything.
 * It is logged, and the tracker fires regardless.
 */
const hasConsent = readConsentCookie();
console.log('consent state', hasConsent);
analytics.track('Signup Completed');
