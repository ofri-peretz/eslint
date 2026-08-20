/**
 * SAFE - ADVERSARIAL. `Buffer.alloc(16)` appears twice, and neither is an IV:
 * one is a length-prefix header, one is a padding block. The IV itself is
 * random. A rule that reports `Buffer.alloc` on sight fires twice here.
 */
import { createCipheriv, randomBytes } from 'node:crypto';

const KEY = Buffer.from(process.env.BLOB_KEY, 'hex');

/** Worker: frame an encrypted blob with a fixed-width header. */
export function frameBlob(body) {
  const header = Buffer.alloc(16);
  const padding = Buffer.alloc(16);
  header.writeUInt32BE(body.length, 0);

  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', KEY, iv);
  return Buffer.concat([header, iv, cipher.update(body), cipher.final(), padding]);
}
