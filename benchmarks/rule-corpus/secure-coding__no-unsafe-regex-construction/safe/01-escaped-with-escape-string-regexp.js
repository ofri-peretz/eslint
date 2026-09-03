/**
 * SAFE - The correct remediation. `escape-string-regexp` is the most-installed
 * escaper in the registry; after it, every character in the user's term is a
 * literal and no metacharacter survives.
 */
const express = require('express');
const escapeStringRegexp = require('escape-string-regexp');
const catalogue = require('../lib/catalogue');

const router = express.Router();

router.get('/products', (req, res) => {
  const matcher = new RegExp(escapeStringRegexp(req.query.pattern), 'i');
  res.json(catalogue.all().filter((p) => matcher.test(p.title)));
});

module.exports = router;
