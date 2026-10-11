// CWE-327: JWT — algorithm confusion, the whitelist admits HMAC AND RSA
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST be detected — with HS256 allowed next to RS256, an attacker signs a
// token with HS256 using the (public) RSA key as the HMAC secret (CVE-2015-9235)
const jwt = require('jsonwebtoken');
const IDP_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEEVs/o5+uQbTjL3chynL4wXgUg2R9
q9UU8I5mEovUf86QZ7kOBIjJwqnzD1omageEHWwHdBO6B+dFabmdT9POxg==
-----END PUBLIC KEY-----`;
function checkToken(token) {
  return jwt.verify(token, IDP_PUBLIC_KEY, { algorithms: ['RS256', 'HS256'] });
}
module.exports = { checkToken };
