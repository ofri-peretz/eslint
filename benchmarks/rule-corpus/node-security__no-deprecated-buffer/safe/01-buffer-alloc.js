/**
 * SAFE - the correct remediation. `Buffer.alloc(n)` is zero-filled and is the
 * documented replacement for `new Buffer(n)`.
 */
import { Buffer } from 'node:buffer';

export function reserve(size) {
  const page = Buffer.alloc(size);
  page.write('MAGIC', 0, 'ascii');
  return page;
}
