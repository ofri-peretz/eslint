/**
 * ADVERSARIAL SAFE - the remediation of vulnerable/07: the same crypto-js call
 * with an OWASP-grade iteration count. The dependency itself is no-cryptojs's
 * business, not this rule's.
 */
import CryptoJS from 'crypto-js';

export const deriveKey = (password, salt) =>
  CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 600000 });
