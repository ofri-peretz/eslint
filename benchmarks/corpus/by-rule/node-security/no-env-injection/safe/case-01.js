// node-security/no-env-injection — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by node-security/no-env-injection
const ALLOWED = { locale: 'APP_LOCALE', theme: 'APP_THEME' };
       function setConfig(req, res) {
         const target = ALLOWED[req.body.setting];
         if (!target) return res.status(400).end();
         process.env[target] = String(req.body.value);
         res.status(204).end();
       }
