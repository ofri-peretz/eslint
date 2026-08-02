// CWE-843: safe — the query value is type-checked before use
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged
// Arrays and objects are rejected up front, so everything downstream sees a
// string and nothing else.
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(helmet());
app.use(rateLimit({ windowMs: 60000, max: 100 }));

app.get('/search', async (req, res) => {
  const raw = req.query.name;
  if (Array.isArray(raw) || typeof raw !== 'string') {
    return res.status(400).json({ error: 'name must be a single string value' });
  }

  const term = raw.replace(/[^a-z0-9 ]/gi, '').toLowerCase();
  res.json(await searchProducts(term));
});

module.exports = app;
