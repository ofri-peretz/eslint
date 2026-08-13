// CWE-359: analytics.track with an opaque account id only
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This must NOT be detected — the remediated form of analytics-email-property.js
analytics.track('signup', { accountId: user.id });
