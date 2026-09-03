/**
 * VULNERABLE - PBKDF2 through Web Crypto, the API a codebase shared with the
 * browser must use. The algorithm is named in the parameter object and the
 * iteration count is 1,000 (CWE-916).
 */
import { webcrypto } from 'node:crypto';

export async function derive(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const material = await webcrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password) as unknown as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: 1000, hash: 'SHA-256' },
    material,
    256,
  );
}
