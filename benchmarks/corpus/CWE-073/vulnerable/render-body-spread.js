// CWE-073: template object injection — req.body used as the render locals
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected
// Express merges the locals object into the view engine options, so a body
// key such as "layout", "settings" or "cache" reconfigures the engine and can
// point it at an attacker-chosen file.
const express = require('express');

const app = express();
app.use(express.json());
app.set('view engine', 'pug');

app.post('/preview', (req, res) => {
  res.render('preview', req.body);
});

module.exports = app;
