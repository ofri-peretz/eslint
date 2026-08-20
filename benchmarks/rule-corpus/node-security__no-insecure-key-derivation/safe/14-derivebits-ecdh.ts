/**
 * ADVERSARIAL SAFE - deriveBits over ECDH. No password, no iteration count.
 */
import { webcrypto } from 'node:crypto';

export const sharedSecret = (privateKey: CryptoKey, publicKey: CryptoKey): Promise<ArrayBuffer> =>
  webcrypto.subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256);
