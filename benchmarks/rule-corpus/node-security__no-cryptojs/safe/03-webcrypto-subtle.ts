/**
 * SAFE - Web Crypto through node:crypto's `webcrypto` export, with the `as`
 * cast a TypeScript caller has to write. Platform crypto, no dependency.
 */
import { webcrypto } from 'node:crypto';

export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await webcrypto.subtle.digest('SHA-256', data as unknown as ArrayBuffer);
  return Buffer.from(digest).toString('hex');
}
