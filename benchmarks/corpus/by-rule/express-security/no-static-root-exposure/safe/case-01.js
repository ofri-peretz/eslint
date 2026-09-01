// express-security/no-static-root-exposure — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by express-security/no-static-root-exposure
const express = require('express');
          const helmet = require('helmet');
          const rateLimit = require('express-rate-limit');
          const path = require('path');

          const app = express();
          app.use(helmet());
          app.use(rateLimit({ windowMs: 60000, max: 100 }));

          app.use(
            express.static(path.join(__dirname, 'public'), {
              index: 'index.html',
              dotfiles: 'ignore',
            }),
          );

          module.exports = app;
