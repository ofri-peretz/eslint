/**
 * SAFE - the correct remediation. The request selects a KEY; the specifier
 * itself comes from a table the program wrote, and an unknown key is rejected
 * before anything is loaded.
 */
const express = require('express');

const FORMATTERS = {
  json: './formatters/json',
  csv: './formatters/csv',
  html: './formatters/html',
};

const router = express.Router();

router.get('/export', (req, res) => {
  const specifier = FORMATTERS[req.query.format];
  if (!specifier) {
    res.status(400).json({ error: 'unsupported format' });
    return;
  }
  const formatter = require(specifier);
  res.send(formatter.emit());
});

module.exports = router;
