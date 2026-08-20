/**
 * SAFE - **the second name probe.** A fixed protocol layout expressed as named
 * constants, which is exactly how a reviewer would ask you to write it. Every
 * index is a `const` integer smaller than the buffer, chosen by this module.
 *
 * A report proves the words "index" and "offset" are doing the deciding.
 */
import { Buffer } from 'node:buffer';

const VERSION_INDEX = 0;
const FLAGS_INDEX = 1;
const LAYOUT = Buffer.from([1, 0, 0, 0]);

export function describe() {
  return { version: LAYOUT[VERSION_INDEX], flags: LAYOUT[FLAGS_INDEX] };
}
