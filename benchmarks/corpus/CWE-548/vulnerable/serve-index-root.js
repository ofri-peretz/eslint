// CWE-548: directory listing — serveIndex mounted at the project root
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected
const express = require('express');
const serveIndex = require('serve-index');

const app = express();

app.use(express.static(__dirname));
app.use(serveIndex('/', { icons: true }));

module.exports = app;
