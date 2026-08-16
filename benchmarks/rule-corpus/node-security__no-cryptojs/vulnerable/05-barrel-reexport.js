/**
 * VULNERABLE - a compatibility barrel that re-exports crypto-js under the
 * project's own name. Every consumer of this file transitively depends on the
 * unmaintained package, and the barrel is the only place it is named (CWE-1104).
 */
export { AES, HmacSHA256, enc } from 'crypto-js';
export const CIPHER_BACKEND = 'legacy';
