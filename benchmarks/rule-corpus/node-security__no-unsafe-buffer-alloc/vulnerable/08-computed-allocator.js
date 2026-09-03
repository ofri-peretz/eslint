/**
 * VULNERABLE (adversarial) - the allocator is reached through a COMPUTED
 * member with a `const` string key. A pooling layer that picks its allocator
 * from configuration is written exactly like this, and the resulting memory is
 * every bit as uninitialized.
 */
import { Buffer } from 'node:buffer';

const ALLOCATOR = 'allocUnsafe';

export function poolSlot(slotBytes) {
  const slot = Buffer[ALLOCATOR](slotBytes);
  slot.writeUInt16BE(0, 0);
  return slot;
}
