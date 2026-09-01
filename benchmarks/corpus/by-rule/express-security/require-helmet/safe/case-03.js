// express-security/require-helmet — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by express-security/require-helmet
const express = require('express');
        const app = express();
        module.exports = app;
        app.set('view engine', 'mustache');
        app.use(express.static('./public'));
