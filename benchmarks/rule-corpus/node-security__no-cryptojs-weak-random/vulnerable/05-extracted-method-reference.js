/**
 * VULNERABLE - the generator is extracted to a local name once and then called
 * as a plain function. One `const` sits between the crypto-js API and the call,
 * and the bytes are still CVE-2020-36732 bytes (CWE-338).
 */
import CryptoJS from 'crypto-js';

const randomWords = CryptoJS.lib.WordArray.random;

export function otpSeed() {
  return randomWords(20).toString(CryptoJS.enc.Hex);
}
