// CWE-248: decodeURIComponent on a route parameter with no try/catch.
// @author       claude-opus-5.5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
// GET /files/a%zz throws URIError: URI malformed, so any client gets a 500
// on demand. Shape: secure-coding/no-unguarded-uri-decode.
const express = require('express');

const app = express();

app.get('/files/:name', (req, res) => {
  const name = decodeURIComponent(req.params.name);
  res.sendFile(name, { root: '/srv/files' });
});

module.exports = app;
