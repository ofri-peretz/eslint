/**
 * VULNERABLE - the canonical CWE-908 shape. A 16-byte frame header is taken
 * from uninitialized memory, four bytes are stamped at offset 0, and the whole
 * thing goes out on the socket. Twelve bytes of whatever the allocator last
 * held are transmitted to the peer.
 */
import { Buffer } from 'node:buffer';

export function writeFrameHeader(socket, payloadLength) {
  const header = Buffer.allocUnsafe(16);
  header.writeUInt32BE(payloadLength, 0);
  socket.write(header);
}
