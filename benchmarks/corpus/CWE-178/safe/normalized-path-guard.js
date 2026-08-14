// CWE-178: safe — path normalized to lower case before the prefix check
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged
// Guard and router now agree on case, so '/Admin/users' is gated exactly the
// same way the lower-case spelling is.
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const ADMIN_PREFIX = '/admin/';

const app = express();
app.use(helmet());
app.use(rateLimit({ windowMs: 60000, max: 100 }));

app.use((req, res, next) => {
  const normalizedPath = req.path.toLowerCase();
  if (normalizedPath.startsWith(ADMIN_PREFIX)) {
    if (!req.user || req.user.role !== 'admin') {
      return res.sendStatus(403);
    }
  }
  next();
});

app.get(/^\/admin\/users$/i, requireAuth, async (req, res) => {
  res.json(await listAllUsers());
});

module.exports = app;
