/**
 * SAFE - **the name probe.** Nothing in this file comes from anywhere but this
 * file: `offset` is a `const` bound to the literal 4, and the buffer is a
 * module constant. There is no request, no socket, no parameter.
 *
 * A report here proves the rule decides by the SPELLING of the index rather
 * than by where its value came from — `offset` is on a keyword list.
 */
import { Buffer } from 'node:buffer';

const MAGIC = Buffer.from('7f454c46', 'hex');
const offset = 4;

export function tail() {
  return MAGIC[offset - 1];
}
