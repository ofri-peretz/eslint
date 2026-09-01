// node-security/no-env-injection — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by node-security/no-env-injection
function setConfig(req, res) {
                 const { key, value } = req.body;
                 process.env[key] = value;
                 res.status(204).end();
               }
