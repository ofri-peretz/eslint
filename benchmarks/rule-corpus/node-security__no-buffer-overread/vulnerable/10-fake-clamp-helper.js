/**
 * VULNERABLE (adversarial) - a local helper wearing a trusted name.
 * `clampIndex` only coerces to a 32-bit integer; `| 0` truncates, it does not
 * bound. The read is as far out of range as the client asks for.
 */
import { Buffer } from 'node:buffer';

const table = Buffer.alloc(256);

function clampIndex(value) {
  return value | 0;
}

export function lookup(req) {
  return table[clampIndex(Number(req.query.slot))];
}
