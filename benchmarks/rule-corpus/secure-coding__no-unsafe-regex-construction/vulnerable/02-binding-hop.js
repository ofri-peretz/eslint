/**
 * VULNERABLE - Exactly fixture 01 with one binding hop. Nobody writes the sink
 * argument inline in real handlers; they name the value first. The provenance is
 * still fully attributable - `filter` has one write and it is `req.query.filter`.
 */
const express = require('express');
const catalogue = require('../lib/catalogue');

const router = express.Router();

router.get('/products/search', (req, res) => {
  const filter = req.query.filter;
  const matcher = new RegExp(filter, 'i');
  res.json(catalogue.all().filter((p) => matcher.test(p.title)));
});

module.exports = router;
