// CWE-327: Safe — GCM decryption verifies the auth tag
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — setAuthTag() plus final() enforce integrity;
// final() throws on a tag mismatch, so tampered ciphertext is rejected.
const crypto = require('crypto');

function decrypt(key, iv, authTag, ciphertext) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let out = decipher.update(ciphertext, 'hex', 'utf8');
  out += decipher.final('utf8'); // throws if the tag does not verify
  return out;
}

module.exports = { decrypt };
