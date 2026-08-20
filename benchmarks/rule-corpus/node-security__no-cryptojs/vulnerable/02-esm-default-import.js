/**
 * VULNERABLE - the ESM spelling of the same dependency. A queue worker decrypts
 * job payloads with an unmaintained AES implementation (CWE-1104).
 */
import CryptoJS from 'crypto-js';

export function decodeJob(envelope, key) {
  const bytes = CryptoJS.AES.decrypt(envelope.payload, key);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}
