/**
 * VULNERABLE - The all-zero IV. `Buffer.alloc(16)` is zero-filled by
 * definition, so this is the most common static IV in real code: it looks like
 * allocation, not like a hardcoded constant.
 */
const { createCipheriv } = require('node:crypto');

const KEY = Buffer.from(process.env.BACKUP_KEY, 'hex');

/** CLI entry point: encrypt a database dump before uploading it. */
export function encryptDump(dump) {
  const cipher = createCipheriv('aes-256-cbc', KEY, Buffer.alloc(16));
  return Buffer.concat([cipher.update(dump), cipher.final()]);
}
