/**
 * SAFE - reads of a buffer's SHAPE rather than its contents. `length`,
 * `byteLength` and `byteOffset` disclose nothing about adjacent memory and can
 * never be out of range.
 */
import { Buffer } from 'node:buffer';

export function describe(frame) {
  const view = new Uint8Array(frame.buffer, frame.byteOffset, frame.byteLength);
  return { length: frame.length, bytes: view.byteLength, at: view.byteOffset };
}
