// CWE-327: JWT — sign with algorithm: 'none'
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST be detected — alg=none disables signature verification (CVE-2015-9235 class)
const jwt = require('jsonwebtoken');
function issue(payload) {
  return jwt.sign(payload, '', { algorithm: 'none' });
}
