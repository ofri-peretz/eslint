/**
 * SAFE - the client-supplied window is CLAMPED to the buffer's own length
 * before it is used. `Math.min` against a bound the peer cannot move is a real
 * mitigation, unlike a comparison against another client value.
 */
import { Buffer } from 'node:buffer';

const archive = Buffer.alloc(8192);

export function preview(req) {
  const requested = Number(req.query.bytes) || 0;
  const safeEnd = Math.min(Math.max(requested, 0), archive.length);
  return archive.subarray(0, safeEnd);
}
