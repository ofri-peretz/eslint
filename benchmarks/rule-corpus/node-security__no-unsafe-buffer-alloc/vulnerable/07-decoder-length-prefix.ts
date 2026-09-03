/**
 * VULNERABLE (CWE-789 arm) - a binary protocol decoder in TypeScript. The
 * length prefix is read off the wire and cast, then used to size a typed
 * array. The `as number` cast is erased at compile time; the peer still picks
 * the allocation.
 */
export function decodeArrayHeader(chunk: Buffer): Uint8Array {
  const count = chunk.readUInt32BE(0) as number;
  const slots = new Uint8Array(count);
  return slots;
}
