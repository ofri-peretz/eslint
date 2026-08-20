/**
 * VULNERABLE - the allocation is passed DIRECTLY into a stream push. It is
 * never bound to a local, so there is no window in which it could have been
 * covered; the uninitialized bytes are the payload.
 */
import { Readable } from 'node:stream';
import { Buffer } from 'node:buffer';

export function paddingStream(padBytes) {
  return new Readable({
    read() {
      this.push(Buffer.allocUnsafe(padBytes));
      this.push(null);
    },
  });
}
