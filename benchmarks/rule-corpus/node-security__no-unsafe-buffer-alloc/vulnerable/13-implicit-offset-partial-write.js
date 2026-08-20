/**
 * VULNERABLE (adversarial) - the same 16-byte leak as `vulnerable/01`, written
 * with the offset OMITTED. `writeUInt32BE(value)` defaults to offset 0 and
 * still writes only four bytes; the other twelve go out on the socket exactly
 * as they came from the allocator.
 *
 * A one-argument call is the shape a "does this call cover the buffer?" test
 * is most likely to wave through.
 */
import { Buffer } from 'node:buffer';

export function writeFrameHeader(socket, payloadLength) {
  const header = Buffer.allocUnsafe(16);
  header.writeUInt32BE(payloadLength);
  socket.write(header);
}
