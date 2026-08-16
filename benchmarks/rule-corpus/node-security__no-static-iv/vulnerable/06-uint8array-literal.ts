/**
 * VULNERABLE - A fixed byte array spelled as `new Uint8Array([...])` and cast
 * to Buffer. TypeScript codebases reach for the typed array rather than
 * Buffer.from; the IV is still sixteen hardcoded bytes.
 */
import { createCipheriv } from 'node:crypto';

const KEY = Buffer.from(process.env.TENANT_KEY as string, 'hex');

const IV_BYTES = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

/** Express route: encrypt a tenant-scoped export. */
export function encryptExport(body: string): Buffer {
  const cipher = createCipheriv('aes-256-cbc', KEY, IV_BYTES as unknown as Buffer);
  return Buffer.concat([cipher.update(body, 'utf8'), cipher.final()]);
}
