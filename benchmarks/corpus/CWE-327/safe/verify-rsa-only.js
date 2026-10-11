// CWE-327: JWT — safe, the whitelist admits only the key's own algorithm
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST NOT fire — an RSA public key verified with RS256 alone
const jwt = require('jsonwebtoken');
const IDP_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEEVs/o5+uQbTjL3chynL4wXgUg2R9
q9UU8I5mEovUf86QZ7kOBIjJwqnzD1omageEHWwHdBO6B+dFabmdT9POxg==
-----END PUBLIC KEY-----`;
function checkToken(token) {
  return jwt.verify(token, IDP_PUBLIC_KEY, { algorithms: ['RS256'] });
}
module.exports = { checkToken };
