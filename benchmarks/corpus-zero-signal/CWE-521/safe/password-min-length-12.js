// CWE-521: password length floor at 12 characters
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This must NOT be detected — the remediated form of password-min-length-4.js
function check(password) {
  if (password.length >= 12) { accept(); }
}
