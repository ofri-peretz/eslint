// CWE-327: JWT — verify accepts 'none' algorithm
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST be detected — accepting alg=none lets attackers forge unsigned tokens
const jwt = require('jsonwebtoken');
function checkToken(token, secret) {
  return jwt.verify(token, secret, { algorithms: ['HS256', 'none'] });
}
