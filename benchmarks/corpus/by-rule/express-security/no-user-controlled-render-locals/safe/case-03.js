// express-security/no-user-controlled-render-locals — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by express-security/no-user-controlled-render-locals
const express = require('express');
          const helmet = require('helmet');
          const rateLimit = require('express-rate-limit');
          const csrf = require('csurf');

          const app = express();
          app.use(helmet());
          app.use(rateLimit({ windowMs: 60000, max: 100 }));
          app.use(express.json({ limit: '10kb' }));
          const csrfProtection = csrf();

          app.post('/preview', csrfProtection, (req, res) => {
            res.render('preview', {
              title: String(req.body.title || ''),
              body: String(req.body.body || ''),
              authorName: String(req.body.authorName || 'anonymous'),
            });
          });

          module.exports = app;
