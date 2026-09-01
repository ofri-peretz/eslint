// lambda-security/require-timeout-handling — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by lambda-security/require-timeout-handling
export const handler = async (event, context) => {
          const remaining = context.getRemainingTimeInMillis();
          if (remaining < 5000) return { statusCode: 503 };
          await fetch('https://api.example.com/data');
        };
