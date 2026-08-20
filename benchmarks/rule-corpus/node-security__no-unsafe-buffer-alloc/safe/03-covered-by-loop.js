/**
 * SAFE - the ioredis command-serializer shape. The allocation is exactly the
 * byte sum of the items, and the loop writes every one of those bytes at a
 * MOVING offset before the buffer escapes. Nothing uninitialized is ever
 * observable.
 */
import { Buffer } from 'node:buffer';

export function serialize(items, totalBytes) {
  const result = Buffer.allocUnsafe(totalBytes);
  let offset = 0;
  for (const item of items) {
    const length = Buffer.byteLength(item);
    result.write(item, offset, length);
    offset += length;
  }
  return result;
}
