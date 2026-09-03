/**
 * SAFE - the remediation. The refresh token is sealed with AES-256-GCM before
 * it reaches disk, so what is at rest is ciphertext plus its authentication
 * tag.
 */
const fs = require('fs');
const crypto = require('crypto');

function encryptWithMasterKey(plaintext, masterKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}

function persistGrant(dest, refreshToken, masterKey) {
  fs.writeFileSync(dest, encryptWithMasterKey(refreshToken, masterKey));
}

module.exports = { persistGrant, encryptWithMasterKey };
