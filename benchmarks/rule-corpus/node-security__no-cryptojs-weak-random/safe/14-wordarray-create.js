/**
 * SAFE - a genuine crypto-js call on the genuine WordArray, but `create`, not
 * `random`. CVE-2020-36732 is about the generator; wrapping existing bytes is
 * not it.
 */
import CryptoJS from 'crypto-js';
import { randomBytes } from 'node:crypto';

export function salt() {
  const words = [...randomBytes(16)].reduce((acc, byte, i) => {
    acc[i >> 2] = (acc[i >> 2] ?? 0) | (byte << (24 - (i % 4) * 8));
    return acc;
  }, []);
  return CryptoJS.lib.WordArray.create(words, 16);
}
