/**
 * SAFE - an 8-byte header allocated unsafely and then FULLY written: two
 * 32-bit fields at offsets 0 and 4 cover bytes 0..7 with nothing left over.
 * No uninitialized byte is ever observable, and this is the single commonest
 * legitimate use of `allocUnsafe` in protocol code.
 *
 * The offsets are literal, so unlike the general case the coverage is decidable
 * without any analysis of runtime values.
 */
import { Buffer } from 'node:buffer';

export function frameHeader(socket, streamId, payloadLength) {
  const header = Buffer.allocUnsafe(8);
  header.writeUInt32BE(streamId, 0);
  header.writeUInt32BE(payloadLength, 4);
  socket.write(header);
}
