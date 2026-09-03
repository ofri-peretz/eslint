/**
 * SAFE - scrypt with memory-hard parameters, one of the two alternatives the
 * rule's own fix line recommends. There is no iteration count to judge.
 */
import { scryptSync, randomBytes } from 'node:crypto';

export function derive(password) {
  const salt = randomBytes(16);
  return { salt, key: scryptSync(password, salt, 64, { N: 2 ** 15, r: 8, p: 1 }) };
}
