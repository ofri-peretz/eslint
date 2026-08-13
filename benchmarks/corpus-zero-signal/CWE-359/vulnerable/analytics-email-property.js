// CWE-359: analytics.track payload carrying an email address
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This MUST be detected by browser-security/no-sensitive-data-in-analytics
analytics.track('signup', { email: user.email });
