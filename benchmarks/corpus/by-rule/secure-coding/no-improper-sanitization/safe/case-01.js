// secure-coding/no-improper-sanitization — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by secure-coding/no-improper-sanitization
Response.json([
          {
            type: "paragraph",
            children: [
              { type: "text", text: "You don't have permission to write to this resource" },
            ],
          },
        ]);
