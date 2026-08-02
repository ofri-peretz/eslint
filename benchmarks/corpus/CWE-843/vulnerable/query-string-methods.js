// CWE-843: req.query type confusion — string method on an unguarded query value
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected
// Express parses ?name=a&name=b into an array, so .replace throws (DoS) and
// ?name[$ne]= produces an object that flows straight into the query layer.
const express = require('express');

const app = express();

app.get('/search', async (req, res) => {
  const term = req.query.name.replace(/[^a-z0-9 ]/gi, '');
  const results = await searchProducts(term.toLowerCase());
  res.json(results);
});

module.exports = app;
