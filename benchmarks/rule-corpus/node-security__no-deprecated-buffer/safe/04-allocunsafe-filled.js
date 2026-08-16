/**
 * SAFE for CWE-676 - `Buffer.allocUnsafe(...).fill(0)` is a modern static
 * method, not the deprecated constructor. Whatever `no-unsafe-buffer-alloc`
 * thinks of it, THIS rule has no business reporting it.
 */
import { Buffer } from 'node:buffer';

export function scratchPage(size) {
  return Buffer.allocUnsafe(size).fill(0);
}
