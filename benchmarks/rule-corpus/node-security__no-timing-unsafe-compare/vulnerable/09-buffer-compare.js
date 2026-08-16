/**
 * VULNERABLE - `Buffer.compare(a, b) === 0`.
 *
 * The static form of 08. The `=== 0` on the outside is a comparison against a
 * literal, which is harmless in itself - all the leakage is inside
 * `Buffer.compare`, which is an ordinary lexicographic memcmp.
 */
'use strict';

const { createHmac, timingSafeEqual } = require('node:crypto');

function checkPayloadSignature(req) {
  const sigBuf = Buffer.from(req.headers['x-payload-signature'], 'base64');
  const expectedSigBuf = createHmac('sha512', process.env.SIGNING_SECRET)
    .update(req.rawBody)
    .digest();

  if (Buffer.compare(sigBuf, expectedSigBuf) === 0) {
    return true;
  }

  // The safe primitive is imported in this very file and not used.
  void timingSafeEqual;
  return false;
}

module.exports = { checkPayloadSignature };
