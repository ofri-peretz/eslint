/**
 * SAFE - the value is encrypted with a real AES-GCM helper before it reaches
 * the store, so what is at rest is ciphertext. This is the remediation the
 * rule's own message asks for.
 */
import { encryptWithDeviceKey } from './crypto/device-key';

export async function persistRefreshToken(refreshToken) {
  const sealed = await encryptWithDeviceKey(refreshToken);
  localStorage.setItem('auth.refresh', sealed);
}
