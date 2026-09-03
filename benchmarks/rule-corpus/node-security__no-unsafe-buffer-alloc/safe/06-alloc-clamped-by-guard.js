/**
 * SAFE - the correct remediation for the CWE-789 arm. The wire-chosen length
 * is rejected against the maximum the protocol actually permits BEFORE it
 * sizes anything.
 */
import { Buffer } from 'node:buffer';

const MAX_FRAME_BYTES = 64 * 1024;

export function readFrame(req) {
  const declared = Number(req.headers['x-frame-length']);
  if (declared > MAX_FRAME_BYTES) {
    throw new RangeError(`frame too long: ${declared}`);
  }
  return Buffer.alloc(declared);
}
