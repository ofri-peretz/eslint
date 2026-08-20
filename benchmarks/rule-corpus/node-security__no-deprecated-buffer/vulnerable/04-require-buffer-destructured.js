/**
 * VULNERABLE - the CommonJS spelling of the same thing: `Buffer` destructured
 * out of `require('buffer')`, then constructed. Bare specifier, not `node:`.
 */
const { Buffer } = require('buffer');
const { createHash } = require('crypto');

function fingerprint(hexDigest) {
  // `new Buffer(str, 'hex')` — deprecated; should be `Buffer.from`.
  const digest = new Buffer(hexDigest, 'hex');
  return createHash('sha256').update(digest).digest('hex');
}

module.exports = { fingerprint };
