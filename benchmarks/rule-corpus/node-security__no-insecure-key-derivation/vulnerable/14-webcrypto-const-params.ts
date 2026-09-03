/**
 * ADVERSARIAL VULNERABLE - the Web Crypto parameter object hoisted to a module
 * constant so the same settings are shared by derive and verify. The sink
 * receives 1,000 iterations (CWE-916).
 */
import { webcrypto } from 'node:crypto';

const PBKDF2_PARAMS = {
  name: 'PBKDF2',
  salt: new TextEncoder().encode('static-salt') as unknown as BufferSource,
  iterations: 1000,
  hash: 'SHA-256',
};

export const derive = (material: CryptoKey): Promise<ArrayBuffer> =>
  webcrypto.subtle.deriveBits(PBKDF2_PARAMS, material, 256);
