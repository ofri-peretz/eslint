// CWE-327: Safe — GCM encryption captures the auth tag
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — the auth tag is produced via getAuthTag() after
// final() and returned so the peer can verify integrity on decrypt.
const crypto = require('crypto');

function encrypt(key, plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let ct = cipher.update(plaintext, 'utf8', 'hex');
  ct += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return { iv, ct, authTag };
}

module.exports = { encrypt };
