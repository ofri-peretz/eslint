/**
 * SAFE - the remediation of vulnerable/06: the same Web Crypto call at the
 * OWASP floor.
 */
import { webcrypto } from 'node:crypto';

export async function derive(material, salt) {
  return webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    material,
    256,
  );
}
