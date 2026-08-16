/**
 * VULNERABLE - The canonical shape: a search box wired straight into the regex
 * engine. `(a+)+$` in the query string is a catastrophic-backtracking DoS, and
 * `.*` turns the filter into a full-table scan.
 */
const express = require('express');
const catalogue = require('../lib/catalogue');

const router = express.Router();

router.get('/products', (req, res) => {
  const matcher = new RegExp(req.query.pattern);
  res.json(catalogue.all().filter((p) => matcher.test(p.title)));
});

module.exports = router;
