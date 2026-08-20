/**
 * VULNERABLE - a PARTIAL mitigation. The bounds check is written against
 * `end`, and the read uses `start`. The guard is real, it is just guarding the
 * wrong variable, which is how this shape survives review.
 */
import { Buffer } from 'node:buffer';

const record = Buffer.alloc(512);

export function slice(req) {
  const start = Number(req.query.start);
  const end = Number(req.query.end);
  if (end > record.length) {
    throw new RangeError('end out of range');
  }
  return record.slice(start, end);
}
