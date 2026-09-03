/**
 * SAFE - a documentation generator. `req.query.offset`, `buf.slice` and
 * `readUInt32LE` appear only inside string literals and comments; the only
 * real buffer read in the file is at a literal offset.
 *
 * A report proves the rule reads TEXT rather than structure.
 */
import { Buffer } from 'node:buffer';

const EXAMPLES = [
  'const view = buf.slice(req.query.offset);  // reported',
  'const value = buf.readUInt32LE(req.body.at); // reported',
];

const BANNER = Buffer.from('CWE-126');

export function render() {
  // buf[req.query.index] is the shape this document is about.
  return `${BANNER.readUInt8(0)}\n${EXAMPLES.join('\n')}`;
}
