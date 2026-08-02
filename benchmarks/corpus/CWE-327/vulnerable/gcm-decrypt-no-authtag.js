// CWE-327: AEAD misuse — GCM decryption without setAuthTag
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — decrypting AES-GCM without setAuthTag() means the
// authentication tag is never checked, defeating the whole point of AEAD.
const crypto = require('crypto');

function decrypt(key, iv, ciphertext) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  // BUG: no decipher.setAuthTag(tag) — forged ciphertext decrypts "successfully"
  let out = decipher.update(ciphertext, 'hex', 'utf8');
  out += decipher.final('utf8');
  return out;
}

module.exports = { decrypt };
