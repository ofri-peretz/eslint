// lambda-security/no-unvalidated-event-body — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by lambda-security/no-unvalidated-event-body
const Joi = require('joi');
        export const handler = async (event) => {
          const { value } = schema.validate(event.body);
          return { statusCode: 200 };
        };
