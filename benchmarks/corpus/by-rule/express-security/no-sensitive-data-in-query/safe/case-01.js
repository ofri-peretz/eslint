// express-security/no-sensitive-data-in-query — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by express-security/no-sensitive-data-in-query
// CWE-598: safe — the same secrets travel in a POST body
// This must NOT be flagged
// A request body is not logged by default, is not stored in browser history
// and never leaks through Referer.
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');

const app = express();
app.use(helmet());
app.use(rateLimit({ windowMs: 60000, max: 10 }));
app.use(express.json({ limit: '10kb' }));
const csrfProtection = csrf();

app.post('/login', csrfProtection, async (req, res) => {
  const { username, password } = req.body;

  const user = await authenticate(username, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  req.session.userId = user.id;
  res.json({ ok: true });
});

module.exports = app;
