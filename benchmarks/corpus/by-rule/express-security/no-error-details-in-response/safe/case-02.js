// express-security/no-error-details-in-response — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by express-security/no-error-details-in-response
try { work(); } catch (err) {
            logger.error(err);
            res.status(500).json({ error: 'Internal error' });
          }
