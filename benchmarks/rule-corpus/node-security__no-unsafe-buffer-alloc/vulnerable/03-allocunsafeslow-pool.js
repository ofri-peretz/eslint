/**
 * VULNERABLE - `allocUnsafeSlow` allocates OUTSIDE the shared pool but is
 * equally uninitialized. Parked on an instance property, it is read by every
 * later method with no covering write in between.
 */
import { Buffer } from 'node:buffer';

export class ConnectionPool {
  constructor(slotBytes) {
    this.slotBytes = slotBytes;
    this.scratch = Buffer.allocUnsafeSlow(slotBytes);
  }

  peek(count) {
    return this.scratch.subarray(0, count).toString('hex');
  }
}
