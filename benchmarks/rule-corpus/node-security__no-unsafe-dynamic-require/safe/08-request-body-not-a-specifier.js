/**
 * SAFE - request data is used everywhere in this handler, but never as a module
 * specifier. Taint that does not reach the sink is not a finding.
 */
const express = require('express');
const validator = require('./validator');

const router = express.Router();

router.post('/orders', (req, res) => {
  const errors = validator.check(req.body);
  if (errors.length > 0) {
    res.status(422).json({ errors });
    return;
  }
  res.status(201).json({ id: req.body.id, sku: req.body.sku });
});

module.exports = router;
