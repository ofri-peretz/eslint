/**
 * SAFE - `while (true)` with an explicit `break`: the standard read-until-EOF
 * loop, and the shape the `allowWhileTrueWithBreak` option exists for.
 */
import { readChunk } from '../lib/stream.js';

export function readAll(handle) {
  const chunks = [];
  while (true) {
    const chunk = readChunk(handle);
    if (!chunk) {
      break;
    }
    chunks.push(chunk);
  }
  return chunks;
}
