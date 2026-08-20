/**
 * SAFE - ADVERSARIAL. The KEY is a hardcoded all-zero buffer — a genuine bug,
 * but CWE-798 (hardcoded credential), not CWE-329. The IV is random. A rule
 * that scans every argument instead of the third one claims this.
 */
const { createCipheriv, randomBytes } = require('node:crypto');

/** Fixture generator for the load-test harness. */
function encryptSample(sample) {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', Buffer.alloc(32), iv);
  return Buffer.concat([iv, cipher.update(sample, 'utf8'), cipher.final()]);
}

module.exports = { encryptSample };
