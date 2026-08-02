// CWE-598: API token and one-time code carried in the query string
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected
const express = require('express');

const app = express();

app.get('/api/export', async (req, res) => {
  const apiToken = req.query.api_token;
  const otp = req.query.otp;

  if (!(await verifyToken(apiToken, otp))) {
    return res.sendStatus(403);
  }

  res.json(await exportAccountData(apiToken));
});

module.exports = app;
