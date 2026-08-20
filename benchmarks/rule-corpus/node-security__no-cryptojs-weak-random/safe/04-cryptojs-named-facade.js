/**
 * SAFE - a compatibility facade kept during the crypto-js removal so call sites
 * did not all have to change in one commit. The object is a local literal; its
 * `random` forwards to the platform CSPRNG.
 */
import { randomBytes } from 'node:crypto';

const CryptoJS = {
  random: (n) => randomBytes(n),
  enc: { Hex: 'hex' },
};

export const legacyToken = () => CryptoJS.random(24).toString(CryptoJS.enc.Hex);
