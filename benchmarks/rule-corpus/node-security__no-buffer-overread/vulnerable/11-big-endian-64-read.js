/**
 * VULNERABLE (adversarial) - the same overread through the 64-bit BIG-ENDIAN
 * reader. Network byte order is big-endian, so protocol code reaches for the
 * `*BE` family almost exclusively; a checker that only knows the `*LE` spelling
 * is blind to most real parsers.
 */
import { Buffer } from 'node:buffer';

const ledger = Buffer.alloc(8192);

export function balanceAt(req) {
  const at = Number(req.params.entry);
  return ledger.readBigUInt64BE(at);
}
