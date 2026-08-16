/**
 * SAFE - Iterating the OWN KEYS of a request object. The bound is the number of
 * properties the parser already materialised, so the loop cannot exceed data
 * that is in memory. `req` is in the condition's text, which is what makes this
 * a useful probe against a text-based check.
 */
const express = require('express');

const router = express.Router();

router.patch('/profile', (req, res) => {
  const applied = [];
  const fields = Object.keys(req.body);
  for (let i = 0; i < fields.length; i++) {
    applied.push(fields[i]);
  }
  res.json({ applied });
});

module.exports = router;
