// CWE-209: stack-trace exposure — err.stack written to the HTTP response
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected
// The stack reveals absolute paths, dependency versions and internal module
// layout — a free reconnaissance channel for an attacker.
const express = require('express');

const app = express();

app.use((err, req, res, next) => {
  res.status(500).send(err.stack);
});

app.get('/reports/:id', async (req, res, next) => {
  try {
    res.json(await loadReport(req.params.id));
  } catch (err) {
    res.status(500).send(err.stack);
  }
});

module.exports = app;
