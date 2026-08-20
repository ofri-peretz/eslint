/**
 * VULNERABLE - The hex string lives in a named constant and Buffer.from() is
 * written at the call site. One `const` hop on the INNER argument rather than
 * on the IV itself; the bytes are just as fixed.
 */
const crypto = require('crypto');

const IV_HEX = '0f1e2d3c4b5a69788796a5b4c3d2e1f0';
const KEY = Buffer.from(process.env.DOC_KEY, 'hex');

/** Build script: encrypt generated documentation bundles. */
function encryptBundle(bytes) {
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, Buffer.from(IV_HEX, 'hex'));
  return Buffer.concat([cipher.update(bytes), cipher.final()]);
}

module.exports = { encryptBundle };
