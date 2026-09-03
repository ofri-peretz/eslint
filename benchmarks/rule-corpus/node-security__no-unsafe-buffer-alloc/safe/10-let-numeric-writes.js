/**
 * SAFE (adversarial) - the twin of `vulnerable/11`. Same `let`, same branch,
 * but every write to it is a numeric literal chosen by this module. Nothing
 * the peer sends can move the allocation.
 */
import { Buffer } from 'node:buffer';

export function reserve(highThroughput) {
  let capacity = 1024;
  if (highThroughput) {
    capacity = 65536;
  }
  return Buffer.alloc(capacity);
}
