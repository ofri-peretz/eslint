/**
 * SAFE — MAXIMUM length caps, not minimums.
 *
 * bcrypt silently truncates at 72 bytes, and an unbounded password field is a
 * denial-of-service vector against a slow KDF, so both caps here are correct
 * hardening. The comparison operators are the same `<=` and `>` that spell a
 * weak minimum elsewhere; what separates them is the threshold, and therefore
 * the minimum the comparison actually enforces — 73 and 129 respectively, both
 * far above the floor.
 *
 * A rule that reasons "operator is in my list AND literal is small" cannot tell
 * these apart from a policy. A rule that computes the enforced minimum can.
 */
import { ValidationError } from '../lib/errors.js';

const BCRYPT_MAX_BYTES = 72;

export function assertPasswordBounds(password) {
  if (password.length > 128) {
    throw new ValidationError('Password too long');
  }

  if (password.length <= BCRYPT_MAX_BYTES) {
    return { truncated: false };
  }

  return { truncated: true };
}
