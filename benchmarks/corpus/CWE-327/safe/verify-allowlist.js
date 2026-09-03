// CWE-327: JWT — safe, verify allowlist excludes 'none'
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST NOT fire — explicit allowlist with secure algorithms only
const jwt = require('jsonwebtoken');
function checkToken(token, secret) {
  return jwt.verify(token, secret, { algorithms: ['RS256', 'ES256'] });
}
