// lambda-security/no-unbounded-batch-processing — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by lambda-security/no-unbounded-batch-processing
export const handler = async (event) => {
          if (event.Records.length > 100) throw new Error('Batch too large');
          for (const record of event.Records) {
            await processRecord(record);
          }
        };
