/**
 * SAFE - `Buffer.concat` builds a new buffer from existing ones. No
 * constructor, no uninitialized bytes: every byte comes from a source buffer.
 */
import { Buffer } from 'node:buffer';

export async function readBody(stream) {
  const parts = [];
  for await (const chunk of stream) parts.push(chunk);
  return Buffer.concat(parts);
}
