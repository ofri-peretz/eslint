// CWE-359: logs a redacted identifier, never the address
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This must NOT be detected — the remediated form of pii-console-log.js
function audit(user) {
  console.log(redact(user.id));
}
