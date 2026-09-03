/**
 * VULNERABLE - One binding between the request and the loop bound. The
 * comparison no longer mentions `req` at all, so any check reading only the
 * printed text of the condition will miss it.
 */
const express = require('express');

const router = express.Router();

router.post('/bulk-invite', (req, res) => {
  const recipientCount = req.body.count;
  const sent = [];
  for (let i = 0; i < recipientCount; i++) {
    sent.push(sendInvite(i));
  }
  res.json({ sent: sent.length });
});

module.exports = router;
