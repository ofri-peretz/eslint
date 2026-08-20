// CWE-601: navigation only after an allowlist check
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-16
// This must NOT be detected — the remediated form of location-assign-unvalidated.js
//
// It carried a standing false positive until 2026-08-16: the rule accepted only
// string LITERALS, so this guarded form reported identically to the unguarded
// write and there was no edit that satisfied the rule short of hardcoding the
// destination. The `safeFixtureStillReports` note recording that is now gone,
// because the finding is.
const next = new URLSearchParams(window.location.search).get('next');
if (isAllowedHost(next)) {
  window.open(next, '_blank');
}
