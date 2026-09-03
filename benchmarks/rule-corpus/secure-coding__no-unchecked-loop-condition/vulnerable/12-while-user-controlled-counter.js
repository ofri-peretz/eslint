/**
 * VULNERABLE - A `while` whose continuation test reads an attacker-chosen
 * ceiling. The decrement is on a different variable than the bound, so the loop
 * is only bounded by the value the client sent.
 */
const express = require('express');

const router = express.Router();

router.get('/replay', (req, res) => {
  const ceiling = req.query.events;
  let cursor = 0;
  const replayed = [];
  while (cursor < ceiling) {
    replayed.push(replayEvent(cursor));
    cursor++;
  }
  res.json({ replayed: replayed.length });
});

module.exports = router;
