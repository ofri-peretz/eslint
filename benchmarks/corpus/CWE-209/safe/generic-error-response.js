// CWE-209: safe — generic client message, real error logged server-side
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
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

app.get('/reports/:id', requireAuth, async (req, res, next) => {
  try {
    res.json(await loadReport(req.params.id));
  } catch (err) {
    next(err);
  }
});

module.exports = app;
