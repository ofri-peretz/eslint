// CWE-548: private file exposure — the application directory served statically
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected
// Serving __dirname publishes .env, package-lock.json, .git metadata and the
// server source itself.
const express = require('express');

const app = express();

app.use(express.static(__dirname));

app.get('/health', (req, res) => res.send('ok'));

module.exports = app;
