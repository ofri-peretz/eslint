/**
 * VULNERABLE - the read offset arrives in an HTTP header and reaches
 * `readUInt32BE` through ONE intermediate `const`. `readUInt32BE` throws
 * ERR_OUT_OF_RANGE past the end, so this is a remote crash as well as a read
 * of whatever the pool happens to hold before the check runs.
 */
import { Buffer } from 'node:buffer';

const index = Buffer.alloc(1024);

export function readSlot(req, res) {
  const at = Number(req.headers['x-slot-offset']);
  const value = index.readUInt32BE(at);
  res.json({ value });
}
