/**
 * VULNERABLE - The false-negative direction, and the test nobody runs.
 *
 * This is vulnerable/02-binding-hop.js with every identifier renamed to a word
 * outside the rule's `userInputVariables` vocabulary
 * (['req','request','body','query','params','input','data']). The HTTP payload
 * is destructured into `payload`, and the count into `howMany`.
 *
 * The dataflow is unchanged: an attacker still chooses the iteration count. If
 * detection dies here, the rule was reading identifier spellings rather than
 * following the value.
 */
const express = require('express');

const router = express.Router();

router.post('/bulk-invite', (envelope, res) => {
  const payload = envelope.body;
  const howMany = payload.count;
  const sent = [];
  for (let i = 0; i < howMany; i++) {
    sent.push(sendInvite(i));
  }
  res.json({ sent: sent.length });
});

module.exports = router;
