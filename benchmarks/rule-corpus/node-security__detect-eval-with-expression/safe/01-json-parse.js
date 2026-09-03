/**
 * SAFE - the remediation for the "eval this JSON" pattern. JSON.parse cannot
 * execute anything, and the try/catch keeps a malformed body a 400.
 */
const express = require('express');

const app = express();

app.post('/import', express.text(), (req, res) => {
  let payload;
  try {
    payload = JSON.parse(req.body);
  } catch {
    res.status(400).json({ error: 'invalid JSON' });
    return;
  }
  res.json({ keys: Object.keys(payload) });
});

module.exports = app;
