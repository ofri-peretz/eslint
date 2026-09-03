/**
 * SAFE - `crypto.randomFillSync(buf)` writes through its FIRST ARGUMENT and,
 * with no offset given, covers the whole allocation. This is the one idiom
 * where `allocUnsafe` is genuinely the right call: the buffer exists only to
 * be overwritten with entropy.
 */
import { randomFillSync } from 'node:crypto';
import { Buffer } from 'node:buffer';

export function nonce(bytes) {
  const value = Buffer.allocUnsafe(bytes);
  randomFillSync(value);
  return value;
}
