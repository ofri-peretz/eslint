// The same decode, guarded: a malformed escape is answered with 400.
// @author       claude
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
const express = require('express');

const app = express();

app.get('/files/:name', (req, res) => {
  let name;
  try {
    name = decodeURIComponent(req.params.name);
  } catch {
    res.sendStatus(400);
    return;
  }
  res.sendFile(name, { root: '/srv/files' });
});

module.exports = app;
