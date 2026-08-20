/**
 * VULNERABLE - The canonical CWE-329 shape: a hex IV written inline at the
 * createCipheriv call site, so every session token encrypts deterministically.
 */
const crypto = require('crypto');

const KEY = Buffer.from(process.env.SESSION_KEY, 'hex');

function sealSession(payload) {
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, '0123456789abcdef');
  return Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
}

module.exports = { sealSession };
