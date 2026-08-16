/**
 * SAFE - the correct remediation for `vulnerable/03`. The same header-supplied
 * offset, checked against BOTH ends of the buffer before the read.
 */
import { Buffer } from 'node:buffer';

const index = Buffer.alloc(1024);

export function readSlot(req, res) {
  const at = Number(req.headers['x-slot-offset']);
  if (!Number.isInteger(at) || at < 0 || at + 4 > index.length) {
    res.status(400).end();
    return;
  }
  res.json({ value: index.readUInt32BE(at) });
}
