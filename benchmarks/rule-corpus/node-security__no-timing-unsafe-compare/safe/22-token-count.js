/**
 * SAFE (wave 2, name-inference probe) - reconciling a reported LLM token count
 * against the metered one.
 *
 * `tokenCount` is a quantity. Nothing here is a credential, and the number is
 * on the customer's own invoice.
 */
'use strict';

async function reconcileUsage(req, res, meter) {
  const usage = await meter.forRequest(req.params.requestId);

  if (req.body.tokenCount !== usage.tokenCount) {
    res.status(409).json({ error: 'usage mismatch', metered: usage.tokenCount });
    return;
  }

  res.json({ ok: true });
}

module.exports = { reconcileUsage };
