/**
 * VULNERABLE (adversarial) - the deprecated constructor reached through an
 * ALIASED import binding. `import { Buffer as NodeBuffer }` is what you write
 * when the module already has its own `Buffer`; the constructed thing is still
 * Node's deprecated `Buffer`, and the size is still attacker-chosen.
 */
import { Buffer as NodeBuffer } from 'node:buffer';

export function reserveFrame(header) {
  const declared = Number(header['x-frame-length']);
  return new NodeBuffer(declared);
}
