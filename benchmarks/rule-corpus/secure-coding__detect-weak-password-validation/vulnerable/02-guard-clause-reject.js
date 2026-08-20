/**
 * The SAME weak policy, written as a guard clause instead of an acceptance test.
 *
 * `if (password.length < 6) reject` and `if (password.length >= 6) accept`
 * express one minimum. This spelling is the more common of the two in modern
 * code — early-return validation is the house style of nearly every Express and
 * Nest codebase — so a rule that matches only `>=`, `>`, `==` and `===` is blind
 * to the majority of the policies it exists to find.
 */
import { BadRequestError } from '../lib/errors.js';

export function assertPasswordPolicy(password) {
  if (password.length < 6) {
    throw new BadRequestError('Password must be at least 6 characters');
  }

  return true;
}
