// lambda-security/no-unvalidated-event-body — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by lambda-security/no-unvalidated-event-body
import { z } from 'zod';
        const schema = z.object({ name: z.string() });
        export const handler = async (event) => {
          const data = schema.parse(JSON.parse(event.body));
          return { statusCode: 200 };
        };
