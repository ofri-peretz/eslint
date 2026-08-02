// CWE-073: template object injection — query string spread into render locals
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected
const express = require('express');

const app = express();
app.set('view engine', 'ejs');

app.get('/newsletter', (req, res) => {
  res.render('newsletter', { ...req.query, generatedAt: Date.now() });
});

module.exports = app;
