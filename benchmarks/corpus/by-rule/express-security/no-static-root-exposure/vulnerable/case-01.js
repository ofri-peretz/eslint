// express-security/no-static-root-exposure — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by express-security/no-static-root-exposure
const express = require('express');

          const app = express();

          app.use(express.static(__dirname));

          app.get('/health', (req, res) => res.send('ok'));

          module.exports = app;
