// CWE-073: safe — locals assembled by explicit field picking
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged
// Only the three fields the template actually reads are forwarded, so no
// request key can reach a view-engine option.
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
