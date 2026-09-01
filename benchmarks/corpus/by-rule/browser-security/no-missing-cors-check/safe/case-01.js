// browser-security/no-missing-cors-check — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by browser-security/no-missing-cors-check
app.use(cors({
              origin: (origin, callback) => {
                if (allowedOrigins.includes(origin)) {
                  callback(null, true);
                } else {
                  callback(new Error('Not allowed'));
                }
              }
            }));
