// CWE-359: console.log of a user email property
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This MUST be detected by secure-coding/no-pii-in-logs
function audit(user) {
  console.log(user.email);
}
