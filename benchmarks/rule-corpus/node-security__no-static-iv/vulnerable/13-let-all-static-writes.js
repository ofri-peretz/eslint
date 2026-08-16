/**
 * VULNERABLE - ADVERSARIAL. A `let` IV whose EVERY write is a fixed value. The
 * mutable binding is what makes a single-assignment `const` resolver give up,
 * but no branch here can produce anything but constant bytes.
 *
 * The mirror image lives in safe/10, where every write is a fresh randomBytes.
 */
import { createCipheriv } from 'node:crypto';

const KEY = Buffer.from(process.env.ARCHIVE_KEY, 'hex');

/** Migration: re-encrypt archive rows under the legacy or v2 IV. */
export function encryptArchive(row, legacy) {
  let iv = Buffer.alloc(16);
  if (!legacy) {
    iv = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
  }
  const cipher = createCipheriv('aes-256-cbc', KEY, iv);
  return Buffer.concat([cipher.update(row, 'utf8'), cipher.final()]);
}
