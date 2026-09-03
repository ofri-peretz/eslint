/**
 * SAFE - a codemod that REWRITES the deprecated constructor. The vocabulary
 * ("new Buffer(", "Buffer(") appears only in string literals, a regular
 * expression and comments. A report here proves the rule reads TEXT rather
 * than structure.
 */
import { Buffer } from 'node:buffer';

// Matches `new Buffer(` and the bare `Buffer(` factory call.
const DEPRECATED_CTOR = /\bnew\s+Buffer\s*\(|(?<![.\w])Buffer\s*\(/g;

export function migrate(source) {
  const replaced = source.replace(DEPRECATED_CTOR, 'Buffer.from(');
  const report = ['new Buffer(size)', 'Buffer(str, enc)']
    .map((shape) => `${shape} -> Buffer.from / Buffer.alloc`)
    .join('\n');
  return { code: replaced, report, bytes: Buffer.byteLength(replaced, 'utf8') };
}
