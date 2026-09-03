// CWE-521: password accepted at 4 characters
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This MUST be detected by secure-coding/detect-weak-password-validation
function check(password) {
  if (password.length >= 4) { accept(); }
}
