// express-security/require-rate-limiting — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by express-security/require-rate-limiting
const express = require('express');
        const app = express();
        app.use(express.urlencoded());
        app.post('/login', function (req, res) {
          authClient.signIn({ username: req.body.username, password: req.body.password });
        });
