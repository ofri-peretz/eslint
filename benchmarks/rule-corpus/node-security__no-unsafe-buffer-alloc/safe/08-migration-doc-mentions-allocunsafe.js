/**
 * SAFE - a migration helper whose whole job is to TALK about the unsafe
 * allocators. `allocUnsafe` and `allocUnsafeSlow` appear only inside string
 * literals and comments; every actual allocation here is `Buffer.alloc`.
 *
 * A report proves the rule reads TEXT rather than structure.
 */
import { Buffer } from 'node:buffer';

const UNSAFE = ['allocUnsafe', 'allocUnsafeSlow'];

export function advise(source) {
  const hits = UNSAFE.filter((name) => source.includes(`Buffer.${name}(`));
  // Buffer.allocUnsafe(n) hands back non-zeroed memory — advise Buffer.alloc.
  const advice = hits.map((name) => `Buffer.${name} -> Buffer.alloc`).join('\n');
  const report = Buffer.alloc(Buffer.byteLength(advice, 'utf8'));
  report.write(advice, 0, 'utf8');
  return report;
}
