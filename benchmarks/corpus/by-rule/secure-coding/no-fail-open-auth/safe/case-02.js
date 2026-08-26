// secure-coding/no-fail-open-auth — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by secure-coding/no-fail-open-auth
async function resolve(req, data) {
       let token = null;
       try { token = verifyJWT(data.token).accessToken; } catch (err) {}
       if (req.method === 'OPTIONS') { return preflight(); }
       if (token) { return grant(token); }
       return deny();
     }
