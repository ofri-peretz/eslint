// CWE-294: JWT — jose token minted with no iat claim
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST be detected — jose adds no iat unless setIssuedAt() is called, so a
// verifier's maxAge / maxTokenAge has nothing to check: token age is unbounded
// beyond exp, the first control a replay defence is built on
const { SignJWT } = require('jose');
async function issue(sub, privateKey) {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'ES256' })
    .setExpirationTime('15m')
    .sign(privateKey);
}
module.exports = { issue };
