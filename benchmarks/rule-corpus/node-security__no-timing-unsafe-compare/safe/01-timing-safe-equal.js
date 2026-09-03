/**
 * SAFE - the remediation for 02/08: length check, then timingSafeEqual.
 *
 * The `.length` comparison is deliberate and safe: the LENGTH of an HMAC is
 * fixed and public, so leaking it leaks nothing, and timingSafeEqual throws
 * on mismatched buffers, so the check has to happen.
 */
'use strict';

const crypto = require('node:crypto');

function verifyWebhook(req, res, next) {
  const provided = Buffer.from(req.headers['x-signature'] || '', 'hex');
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest();

  if (provided.length !== expectedSignature.length) {
    res.status(401).send('bad signature');
    return;
  }

  if (!crypto.timingSafeEqual(provided, expectedSignature)) {
    res.status(401).send('bad signature');
    return;
  }

  next();
}

module.exports = { verifyWebhook };
