/**
 * SAFE — an emptiness check, not a strength policy.
 *
 * `password.length === 0` asks "did the user type anything", which every login
 * form asks before it does anything else. It states no minimum at all, so
 * calling it "Password length requirement is too weak (less than 8 characters)"
 * is simply a wrong description of the code.
 *
 * A threshold of zero is the unambiguous signature of a presence check: no
 * policy has ever required "at least 0 characters".
 */
import { BadRequestError } from '../lib/errors.js';

export function login(email, password) {
  if (password.length === 0) {
    throw new BadRequestError('Password is required');
  }

  if (password.length > 0 && email.length > 0) {
    return { attempted: true };
  }

  return { attempted: false };
}
