/**
 * SAFE - the correct remediation. `Buffer.alloc(n)` is zero-filled, and the
 * size is a module constant the peer cannot influence.
 */
import { Buffer } from 'node:buffer';

const HEADER_BYTES = 16;

export function newHeader(payloadLength) {
  const header = Buffer.alloc(HEADER_BYTES);
  header.writeUInt32BE(payloadLength, 0);
  return header;
}
