/**
 * SAFE - A per-message IV derived from randomUUID(). Unusual, but it is a
 * CSPRNG source and the bytes differ every call.
 */
const crypto = require('crypto');

const KEY = Buffer.from(process.env.NOTE_KEY, 'hex');

function encryptNote(text) {
  const iv = Buffer.from(crypto.randomUUID().replace(/-/g, ''), 'hex');
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  return Buffer.concat([iv, cipher.update(text, 'utf8'), cipher.final()]);
}

module.exports = { encryptNote };
