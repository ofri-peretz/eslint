// CWE-601: navigation only after an allowlist check
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This must NOT be detected — the remediated form of location-assign-unvalidated.js
if (isAllowedHost(userUrl)) {
  window.location = userUrl;
}
