/**
 * VULNERABLE (adversarial) - A LOCAL function wearing a trusted name. `sanitize`
 * here trims whitespace; every regex metacharacter survives it. A rule that
 * trusts the NAME switches itself off for the whole expression.
 */
const express = require('express');

const router = express.Router();

function sanitize(value) {
  return String(value).trim();
}

router.get('/audit', (req, res) => {
  const matcher = new RegExp(sanitize(req.query.pattern), 'i');
  res.json({ pattern: matcher.source });
});

module.exports = router;
