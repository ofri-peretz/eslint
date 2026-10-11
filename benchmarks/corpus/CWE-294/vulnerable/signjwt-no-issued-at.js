// CWE-294: JWT — jose token minted with no iat claim
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST be detected — jose adds no iat unless setIssuedAt() is called, so
// the receiver cannot tell how old the token is or reject a replayed one
const { SignJWT } = require('jose');
async function issue(sub, privateKey) {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'ES256' })
    .setExpirationTime('15m')
    .sign(privateKey);
}
module.exports = { issue };
