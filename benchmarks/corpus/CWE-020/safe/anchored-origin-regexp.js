// CWE-020: Safe — fully anchored origin regexp
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST NOT be flagged — ^…$ pins the whole origin, so no suffix or prefix trick matches
const ALLOWED_ORIGIN = /^https:\/\/app\.example\.com$/;

window.addEventListener('message', (event) => {
  if (!ALLOWED_ORIGIN.test(event.origin)) {
    return;
  }
  applySettings(event.data);
});
