// express-security/no-error-details-in-response — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by express-security/no-error-details-in-response
// CWE-209: safe — generic client message, real error logged server-side
// This must NOT be flagged
// The client gets a correlation id and nothing else; the detail stays in the
// server log where only operators can read it.
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
app.use(helmet());
app.use(rateLimit({ windowMs: 60000, max: 100 }));

app.use((err, req, res, next) => {
  const incidentId = crypto.randomUUID();
  logger.error({ incidentId, err, path: req.path }, 'unhandled request error');
  res.status(500).json({ error: 'Internal Server Error', incidentId });
});

app.get('/reports/:id', async (req, res, next) => {
  try {
    res.json(await loadReport(req.params.id));
  } catch (err) {
    next(err);
  }
});

module.exports = app;
