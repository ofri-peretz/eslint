/**
 * VULNERABLE - partial mitigation. Stripping the literal string `../` once is
 * defeated by `....//`, which collapses back to `../` after the replacement.
 * The value still names the module.
 */
const express = require('express');

const router = express.Router();

router.get('/report/:format', (req, res) => {
  const format = req.params.format.replace('../', '');
  const formatter = require('./formatters/' + format);
  res.type('text/plain').send(formatter.emit());
});

module.exports = router;
