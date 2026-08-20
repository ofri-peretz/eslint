/**
 * VULNERABLE - `Buffer.prototype.equals` on a signature.
 *
 * `buf.equals(other)` is memcmp: it returns as soon as two bytes differ. Node's
 * own crypto documentation calls this out and is the reason timingSafeEqual
 * exists. Reaching for `.equals` is the mistake somebody makes precisely
 * BECAUSE they knew enough to convert to Buffers first.
 */
'use strict';

const { createHmac } = require('node:crypto');

function verifySignature(req, res, next) {
  const provided = Buffer.from(req.headers['x-signature'], 'hex');
  const expectedDigest = createHmac('sha256', process.env.SIGNING_KEY)
    .update(req.rawBody)
    .digest();

  if (!provided.equals(expectedDigest)) {
    res.status(401).send('bad signature');
    return;
  }

  next();
}

module.exports = { verifySignature };
