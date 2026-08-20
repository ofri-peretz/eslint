/**
 * VULNERABLE - `lodash.isEqual` on two digests.
 *
 * A deep-equality helper is a short-circuiting comparison with extra steps.
 * Reaching for it here is common in codebases that already import lodash
 * everywhere, and it carries the same per-byte leak.
 */
'use strict';

const isEqual = require('lodash.isequal');
const { createHash } = require('node:crypto');

function checkDownloadIntegrity(req, storedDigest) {
  const providedDigest = createHash('sha256').update(req.body.payload).digest('hex');

  if (isEqual(providedDigest, storedDigest)) {
    return { ok: true };
  }
  return { ok: false };
}

module.exports = { checkDownloadIntegrity };
