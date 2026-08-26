// lambda-security/no-user-controlled-requests — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by lambda-security/no-user-controlled-requests
export const handler = async (event) => {
          const targetUrl = event.queryStringParameters.targetUrl;
          const response = await fetch(targetUrl);
          return { statusCode: 200 };
        };
