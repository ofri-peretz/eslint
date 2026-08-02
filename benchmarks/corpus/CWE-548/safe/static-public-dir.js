// CWE-548: safe — static hosting scoped to a dedicated public directory
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged
// Only files intentionally placed in public/ are reachable, directory
// listings are disabled and dotfiles are ignored.
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
