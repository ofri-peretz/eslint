/**
 * VULNERABLE - The ternary's FALSE arm. Consent was refused on this path.
 */
hasCookieConsent ? renderBanner() : analytics.page('Home');
