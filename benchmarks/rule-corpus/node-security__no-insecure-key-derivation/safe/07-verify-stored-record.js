/**
 * SAFE - a verifier that re-derives with the iteration count STORED alongside
 * the hash, which is how a password store that can raise its cost factor works.
 * The value is unknowable at lint time and abstaining is the correct answer.
 */
import { pbkdf2Sync, timingSafeEqual } from 'node:crypto';

export function verify(password, record) {
  const candidate = pbkdf2Sync(password, record.salt, record.iterations, record.keylen, record.digest);
  return candidate.length === record.hash.length && timingSafeEqual(candidate, record.hash);
}
