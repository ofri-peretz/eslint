/**
 * SAFE - `Buffer` imported from a LOCAL module (`./lib/frame-buffer`), which
 * exports a project class of that name. The binding resolves to an import of a
 * relative path, not to `buffer` / `node:buffer` / the global.
 */
import { Buffer } from './lib/frame-buffer.js';

export function newFrameBuffer(frames) {
  const fb = new Buffer(frames);
  fb.reset();
  return fb;
}
