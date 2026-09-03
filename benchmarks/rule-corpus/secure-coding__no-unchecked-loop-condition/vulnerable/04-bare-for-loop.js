/**
 * VULNERABLE - `for (;;)` with neither a test nor an update. Same shape as
 * `while (true)` and the same absence of a termination condition.
 */
import { readFrame } from '../lib/protocol.js';

export function readAllFrames(socket) {
  const frames = [];
  for (;;) {
    frames.push(readFrame(socket));
  }
}
