// CWE-327: JWT — safe, signed with RS256
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST NOT fire — explicit asymmetric algorithm
const jwt = require('jsonwebtoken');
function issue(payload, privateKey) {
  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}
