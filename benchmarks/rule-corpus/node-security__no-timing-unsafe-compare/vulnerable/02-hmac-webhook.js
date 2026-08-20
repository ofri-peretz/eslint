/**
 * VULNERABLE - webhook HMAC verification with `!==`.
 *
 * This is the canonical CWE-208 shape and the reason Node ships
 * `crypto.timingSafeEqual`. The attacker controls the signature header
 * completely and can replay the same body until the comparison gets slower,
 * byte by byte, until they hold a valid signature for a body they wrote.
 */
'use strict';

const { createHmac } = require('node:crypto');

function verifyWebhook(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const expectedSignature = `sha256=${createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest('hex')}`;

  if (signature !== expectedSignature) {
    res.status(401).send('bad signature');
    return;
  }

  next();
}

module.exports = { verifyWebhook };
