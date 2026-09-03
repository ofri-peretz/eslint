/**
 * VULNERABLE - aes-js implementing CTR mode in JavaScript, with the byte-array
 * casts a TypeScript caller has to write. node:crypto ships AES-CTR (CWE-1104).
 */
import aesjs from 'aes-js';

export function encryptCounter(key: number[], plaintext: string): string {
  const bytes = aesjs.utils.utf8.toBytes(plaintext) as number[];
  const cipher = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
  return aesjs.utils.hex.fromBytes(cipher.encrypt(bytes));
}
