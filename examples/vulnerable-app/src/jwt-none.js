// FLAGSHIP: jwt/no-algorithm-none · CWE-327 (Broken/Risky Crypto)
// Verifying a JWT with `algorithms: ['none']` (or no algorithm constraint at all)
// lets an attacker forge any token. The canonical "none algorithm" bypass class.

import jwt from 'jsonwebtoken';

export function verifyToken(token) {
  // ❌ Vulnerable: accepts the 'none' algorithm.
  return jwt.verify(token, '', { algorithms: ['none'] });
}

export function verifyTokenLoose(token, secret) {
  // ❌ Also vulnerable: when `algorithms` is omitted, `jwt.verify` accepts any algorithm
  //    listed in the token header — including `none`.
  return jwt.verify(token, secret);
}

// ✅ Safe equivalent:
//   jwt.verify(token, secret, { algorithms: ['HS256'] });
