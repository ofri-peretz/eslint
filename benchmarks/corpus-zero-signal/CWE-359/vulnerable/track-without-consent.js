// CWE-359: analytics.track fired with no consent check
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This MUST be detected by browser-security/no-tracking-without-consent
analytics.track('page_view');
