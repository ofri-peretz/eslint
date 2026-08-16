/**
 * SAFE - A `let` whose every write is a fresh randomBytes call. The binding is
 * mutable, which is exactly why a rule must not resolve it as a constant, but
 * nothing static ever reaches the sink.
 */
import { createCipheriv, randomBytes } from 'node:crypto';

const KEY = Buffer.from(process.env.BATCH_KEY, 'hex');

/** Worker: encrypt each item of a batch under its own IV. */
export function encryptBatch(items) {
  let iv = randomBytes(16);
  return items.map((item) => {
    iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', KEY, iv);
    return Buffer.concat([iv, cipher.update(item, 'utf8'), cipher.final()]);
  });
}
