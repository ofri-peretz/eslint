/**
 * ADVERSARIAL SAFE - a LOCAL function called `random`, backed by the platform
 * CSPRNG. The call site is a bare identifier, exactly like the vulnerable
 * extracted-reference fixtures; the difference is what it resolves to.
 */
import { randomInt } from 'node:crypto';

function random(max) {
  return randomInt(0, max);
}

export const pickShard = (shards) => random(shards);
