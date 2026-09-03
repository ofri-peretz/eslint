/**
 * SAFE - `Buffer.allocUnsafe(n).fill(0)` zeroes the allocation in the same
 * expression. Semantically identical to `Buffer.alloc(n)`, and a documented
 * exemption: there is no window in which an uninitialized byte is observable.
 */
import { Buffer } from 'node:buffer';

const SLOT_BYTES = 4096;

export function newSlot() {
  return Buffer.allocUnsafe(SLOT_BYTES).fill(0);
}
