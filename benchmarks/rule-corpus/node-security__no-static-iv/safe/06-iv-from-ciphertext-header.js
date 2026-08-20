/**
 * SAFE - The decrypt side reading the per-message IV back out of the stored
 * blob. This is the CORRECT decrypt shape and it must not be confused with a
 * hardcoded IV just because the offsets are literals.
 */
const cp = require('node:crypto');

const KEY = Buffer.from(process.env.LEGACY_KEY, 'hex');

function decryptRow(blob) {
  const iv = blob.subarray(0, 16);
  const body = blob.subarray(16);
  const decipher = cp.createDecipheriv('aes-256-cbc', KEY, iv);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}

module.exports = { decryptRow };
