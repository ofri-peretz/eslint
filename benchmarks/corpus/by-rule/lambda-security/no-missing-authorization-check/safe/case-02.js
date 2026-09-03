// lambda-security/no-missing-authorization-check — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by lambda-security/no-missing-authorization-check
export const handler = async (event) => {
          const claims = event.requestContext.authorizer.claims;
          if (!claims.sub) return { statusCode: 401 };
          await db.query('SELECT * FROM users');
        };
