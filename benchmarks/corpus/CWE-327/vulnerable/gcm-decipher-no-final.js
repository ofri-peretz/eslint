// CWE-327: AEAD misuse — GCM decryption never calls .final()
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — without decipher.final() the GCM auth tag is never
// verified, so tampered ciphertext is accepted as authentic plaintext.
const crypto = require('crypto');

function decrypt(key, iv, authTag, ciphertext) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const out = decipher.update(ciphertext, 'hex', 'utf8');
  // BUG: decipher.final() omitted — the integrity check is skipped entirely
  return out;
}

module.exports = { decrypt };
