// CWE-359: tracking gated on a stored consent decision
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This must NOT be detected — the remediated form of track-without-consent.js
if (hasConsent()) {
  analytics.track('page_view');
}
