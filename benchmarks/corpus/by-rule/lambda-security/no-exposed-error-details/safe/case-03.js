// lambda-security/no-exposed-error-details — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by lambda-security/no-exposed-error-details
export const handler = async (event) => {
          try {
            await riskyOperation();
          } catch (error) {
            console.error(error);
            return { statusCode: 500, body: JSON.stringify({ message: 'Internal error' }) };
          }
        };
