/**
 * VULNERABLE (adversarial) - a LOCAL helper wearing a trusted name. `safeAlloc`
 * does nothing but forward to `Buffer.allocUnsafe`, and the buffer it returns
 * is written to the response with only its first two bytes stamped.
 *
 * The name is the lie; the allocation inside is the evidence.
 */
import { Buffer } from 'node:buffer';

function safeAlloc(size) {
  return Buffer.allocUnsafe(size);
}

export function respond(res, payloadLength) {
  const frame = safeAlloc(payloadLength);
  frame.writeUInt16BE(payloadLength, 0);
  res.end(frame);
}
