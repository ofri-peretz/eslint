/**
 * SAFE - ADVERSARIAL. `new Uint8Array(16)` is a zero-filled buffer, exactly
 * like Buffer.alloc(16) — and `getRandomValues` overwrites it before use. The
 * allocation is identical to the vulnerable shape; only the fill separates
 * them.
 */
import { createCipheriv, webcrypto } from 'node:crypto';

const KEY = Buffer.from(process.env.SYNC_KEY as string, 'hex');

/** Sync worker: encrypt one changeset. */
export function encryptChangeset(changeset: string): Buffer {
  const iv = new Uint8Array(16);
  webcrypto.getRandomValues(iv);
  const cipher = createCipheriv('aes-256-cbc', KEY, iv as unknown as Buffer);
  return Buffer.concat([cipher.update(changeset, 'utf8'), cipher.final()]);
}
