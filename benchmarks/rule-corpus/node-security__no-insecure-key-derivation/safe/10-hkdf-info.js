/**
 * SAFE - HKDF, which expands an already-high-entropy secret and deliberately
 * has no iteration count. Judging it by PBKDF2's floor would be a category
 * error.
 */
import { hkdfSync } from 'node:crypto';

export const subkey = (masterKey, salt, label) =>
  Buffer.from(hkdfSync('sha256', masterKey, salt, label, 32));
