/**
 * ADVERSARIAL SAFE - the same deriveBits sink with a DIFFERENT algorithm. HKDF
 * has no iteration count; the small numbers here are a hash size and an output
 * length. A rule that matched deriveBits alone would report this.
 */
import { webcrypto } from 'node:crypto';

export const subkey = (master, salt, info) =>
  webcrypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, master, 256);
