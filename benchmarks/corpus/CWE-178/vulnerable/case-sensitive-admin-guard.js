// CWE-178: case-sensitive guard in front of a case-insensitive route
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected
// The guard only sees '/admin', but the route regex has the 'i' flag, so
// GET /Admin/users reaches the handler with no authorization check at all.
const express = require('express');

const app = express();

app.use((req, res, next) => {
  if (req.path.startsWith('/admin')) {
    if (!req.user || req.user.role !== 'admin') {
      return res.sendStatus(403);
    }
  }
  next();
});

app.get(/^\/admin\/users$/i, async (req, res) => {
  res.json(await listAllUsers());
});

module.exports = app;
