/**
 * SAFE - ADVERSARIAL. The deprecated `createCipher` takes a passphrase and no
 * IV at all. It is a finding for `no-deprecated-cipher-method`; claiming it
 * here would mean the IV signal no longer means "the IV is static".
 */
const crypto = require('crypto');

/** Legacy reader kept for one more release. */
function decryptLegacy(blob) {
  const decipher = crypto.createDecipher('aes-256-cbc', process.env.OLD_PASSPHRASE);
  return Buffer.concat([decipher.update(blob), decipher.final()]).toString('utf8');
}

module.exports = { decryptLegacy };
