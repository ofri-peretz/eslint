// express-security/no-user-controlled-render-locals — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by express-security/no-user-controlled-render-locals
const express = require('express');

          const app = express();
          app.use(express.json());
          app.set('view engine', 'pug');

          app.post('/preview', (req, res) => {
            res.render('preview', req.body);
          });

          module.exports = app;
