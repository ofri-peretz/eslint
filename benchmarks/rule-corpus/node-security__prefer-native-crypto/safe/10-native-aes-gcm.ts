/**
 * SAFE - the remediation of vulnerable/05: AES-GCM from node:crypto, with the
 * cast a TypeScript caller writes for a key read out of config.
 */
import { createCipheriv, randomBytes } from 'node:crypto';

export function seal(plaintext: string, key: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key as Buffer, iv);
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}
