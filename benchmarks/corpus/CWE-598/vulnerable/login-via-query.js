// CWE-598: credentials in the query string of a GET request
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected
// Query strings land in access logs, proxy logs, browser history and the
// Referer header of every outbound link on the response page.
const express = require('express');

const app = express();

app.get('/login', async (req, res) => {
  const { username, password } = req.query;

  const user = await authenticate(username, password);
  if (!user) return res.status(401).send('Invalid credentials');

  req.session.userId = user.id;
  res.redirect('/dashboard');
});

module.exports = app;
