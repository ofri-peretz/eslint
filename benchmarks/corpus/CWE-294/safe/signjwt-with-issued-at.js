// CWE-294: JWT — safe, jose token carries iat
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-11
// This MUST NOT fire — setIssuedAt() stamps iat, so the token's age is known
const { SignJWT } = require('jose');
async function issue(sub, privateKey) {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(privateKey);
}
module.exports = { issue };
