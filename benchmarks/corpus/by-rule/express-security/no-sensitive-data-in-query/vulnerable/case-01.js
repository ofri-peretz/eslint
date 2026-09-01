// express-security/no-sensitive-data-in-query — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by express-security/no-sensitive-data-in-query
// CWE-598: credentials in the query string of a GET request
// This MUST be detected
// Query strings land in access logs, proxy logs, browser history and the
// Referer header of every outbound link on the response page.
const express = require('express');

const app = express();

app.get('/login', async (req, res) => {
  const { username, password } = req.query;

  const user = await authenticate(username, password);
  if (!user) return res.status(401).send('Invalid credentials');

  req.session.userId = user.id;
  res.redirect('/dashboard');
});

module.exports = app;
