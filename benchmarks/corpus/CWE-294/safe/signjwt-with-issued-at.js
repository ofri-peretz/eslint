// CWE-294: JWT — safe, a one-time token the verifier can bound and burn
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-12
// This MUST NOT fire. `iat` alone is not replay protection — it only makes a
// token's age knowable. Replay resistance comes from the pair below: the issuer
// stamps iat + a unique jti with a short lifetime, and the verifier pins the
// algorithm, bounds age with maxTokenAge, and accepts each jti exactly once.
const { randomUUID } = require('node:crypto');
const { SignJWT, jwtVerify } = require('jose');

const ISSUER = 'https://auth.example.com';
const AUDIENCE = 'https://api.example.com';

async function issue(sub, privateKey) {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime('2m')
    .sign(privateKey);
}

/** `seen` is a shared store (e.g. Redis SET NX with TTL) of jti values already used. */
async function accept(token, publicKey, seen) {
  const { payload } = await jwtVerify(token, publicKey, {
    algorithms: ['ES256'],
    issuer: ISSUER,
    audience: AUDIENCE,
    maxTokenAge: '2m',
  });
  if (!payload.jti || !(await seen.addIfAbsent(payload.jti, 120))) {
    throw new Error('token replayed');
  }
  return payload;
}

module.exports = { issue, accept };
