/**
 * SAFE - The WebCrypto spelling of the same remediation, in a TypeScript file
 * with an `as` cast between the typed array and Buffer.
 */
import { createCipheriv, webcrypto } from 'node:crypto';

const KEY = Buffer.from(process.env.TENANT_KEY as string, 'hex');

export function encryptExport(body: string): Buffer {
  const iv = webcrypto.getRandomValues(new Uint8Array(16)) as unknown as Buffer;
  const cipher = createCipheriv('aes-256-cbc', KEY, iv);
  return Buffer.concat([cipher.update(body, 'utf8'), cipher.final()]);
}
