/**
 * SAFE - The correct remediation, written inline: a fresh CSPRNG IV per call,
 * prepended to the ciphertext so the decrypt side can recover it.
 */
const crypto = require('crypto');

const KEY = Buffer.from(process.env.SESSION_KEY, 'hex');

function sealSession(payload) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, crypto.randomBytes(16));
  return Buffer.concat([iv, cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
}

module.exports = { sealSession };
