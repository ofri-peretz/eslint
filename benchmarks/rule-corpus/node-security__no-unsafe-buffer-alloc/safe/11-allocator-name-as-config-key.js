/**
 * SAFE (adversarial) - `allocUnsafe` appears only as an OBJECT KEY and a
 * string in a policy table. No allocator is called with it; every allocation
 * in this file is `Buffer.alloc`.
 */
import { Buffer } from 'node:buffer';

export const bufferPolicy = {
  allocUnsafe: false,
  allocUnsafeSlow: false,
  preferred: 'alloc',
};

export function describePolicy() {
  const text = Object.entries(bufferPolicy)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(';');
  const out = Buffer.alloc(64);
  out.write(text, 0, 'utf8');
  return out;
}
