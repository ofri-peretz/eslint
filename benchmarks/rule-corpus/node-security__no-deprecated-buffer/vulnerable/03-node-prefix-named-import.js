/**
 * VULNERABLE - `Buffer` reached through the ESM named import from
 * `node:buffer` rather than through the global. The constructor is the same
 * deprecated constructor; the import only changes how the name got here.
 */
import { Buffer } from 'node:buffer';
import { createReadStream } from 'node:fs';

export function preallocateChunk(chunkLength) {
  const chunk = new Buffer(chunkLength);
  return chunk;
}

export function tail(file) {
  return createReadStream(file, { highWaterMark: 64 * 1024 });
}
