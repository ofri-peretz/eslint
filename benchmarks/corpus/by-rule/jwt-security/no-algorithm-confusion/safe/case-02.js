// jwt-security/no-algorithm-confusion — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by jwt/no-algorithm-confusion
import jwt from 'jsonwebtoken';
jwt.verify(token, publicKey, { algorithms: ['ES256'] });
