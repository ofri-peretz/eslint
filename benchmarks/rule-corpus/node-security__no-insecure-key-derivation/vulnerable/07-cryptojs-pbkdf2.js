/**
 * VULNERABLE - crypto-js's PBKDF2, whose iteration count lives in an options
 * object and whose default is 1. 1,000 rounds of PBKDF2-SHA1 is the same
 * CWE-916 defect as the node:crypto spelling (CWE-916).
 */
import CryptoJS from 'crypto-js';

export const deriveKey = (password, salt) =>
  CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 1000 });
