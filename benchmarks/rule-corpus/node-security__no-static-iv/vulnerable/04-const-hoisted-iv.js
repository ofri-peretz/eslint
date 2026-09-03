/**
 * VULNERABLE - The IV hoisted to a module constant and reused by every call.
 * Hoisting is ordinary style, not obfuscation, so this is how the bug is
 * usually written rather than an evasion.
 */
import crypto from 'node:crypto';

const IV = Buffer.from('cafebabecafebabecafebabecafebabe', 'hex');
const KEY = Buffer.from(process.env.AUDIT_KEY, 'hex');

/** Worker: encrypt each audit record before writing it to the queue. */
export function encryptRecord(record) {
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, IV);
  return Buffer.concat([cipher.update(record, 'utf8'), cipher.final()]);
}
