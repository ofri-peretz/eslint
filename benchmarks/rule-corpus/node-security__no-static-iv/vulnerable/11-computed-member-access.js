/**
 * VULNERABLE - ADVERSARIAL. The factory reached by a computed member,
 * `crypto['createCipheriv']`. The property is a string Literal, not an
 * Identifier, so a rule that reads `callee.property.name` sees nothing.
 */
const crypto = require('node:crypto');

const KEY = Buffer.from(process.env.FEED_KEY, 'hex');

/** Worker: encrypt a syndication feed payload. */
function encryptFeed(xml) {
  const cipher = crypto['createCipheriv']('aes-256-cbc', KEY, '0123456789abcdef');
  return Buffer.concat([cipher.update(xml, 'utf8'), cipher.final()]);
}

module.exports = { encryptFeed };
