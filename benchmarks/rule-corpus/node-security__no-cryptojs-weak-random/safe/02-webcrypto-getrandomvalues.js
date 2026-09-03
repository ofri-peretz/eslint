/**
 * SAFE - Web Crypto's CSPRNG, the browser-compatible remediation the rule's own
 * fix line recommends.
 */
import { webcrypto } from 'node:crypto';

export function nonce(length = 16) {
  const bytes = new Uint8Array(length);
  webcrypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}
