/**
 * VULNERABLE - The decrypt half. A static IV on createDecipheriv is the
 * fingerprint of a static IV on the encrypt half, and is frequently the only
 * half that survives a refactor into a separate module.
 */
const cp = require('node:crypto');

const KEY = Buffer.from(process.env.LEGACY_KEY, 'hex');

/** Migration script: read rows written by the old encrypt path. */
function decryptLegacyRow(blob) {
  const decipher = cp.createDecipheriv('aes-256-cbc', KEY, 'abcdef0123456789');
  return Buffer.concat([decipher.update(blob), decipher.final()]).toString('utf8');
}

module.exports = { decryptLegacyRow };
