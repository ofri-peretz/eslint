/**
 * VULNERABLE - A "formula" field compiled with the Function constructor. This is
 * how low-code builders ship RCE: the constructor is `eval` with a different
 * spelling and no `no-eval` rule watching it.
 */
const express = require('express');

const router = express.Router();

router.post('/formulas/preview', (req, res) => {
  const compute = new Function('row', 'return ' + req.body.formula + ';');
  res.json({ value: compute(req.body.row) });
});

module.exports = router;
