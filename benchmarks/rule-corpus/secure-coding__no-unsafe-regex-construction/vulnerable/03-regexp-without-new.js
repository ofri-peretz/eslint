/**
 * VULNERABLE - `RegExp(x)` without `new` is identical to `new RegExp(x)` per
 * spec; the constructor returns the object either way. Lodash, Ramda and most
 * older codebases omit `new`.
 */
const express = require('express');

const router = express.Router();

router.post('/rules', (req, res) => {
  const guard = RegExp(req.body.search);
  res.json({ compiled: guard.source });
});

module.exports = router;
