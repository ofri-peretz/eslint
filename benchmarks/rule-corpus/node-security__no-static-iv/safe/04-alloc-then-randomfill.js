/**
 * SAFE - `Buffer.alloc(16)` allocates the zero buffer, and `randomFillSync`
 * overwrites it before use. The allocation call looks identical to the
 * all-zero-IV bug; only the subsequent fill separates them, so a rule that
 * judges `Buffer.alloc(16)` on sight alone reports here.
 */
const { createCipheriv, randomFillSync } = require('node:crypto');

const KEY = Buffer.from(process.env.BACKUP_KEY, 'hex');

export function encryptDump(dump) {
  const iv = Buffer.alloc(16);
  randomFillSync(iv);
  const cipher = createCipheriv('aes-256-cbc', KEY, iv);
  return Buffer.concat([iv, cipher.update(dump), cipher.final()]);
}
