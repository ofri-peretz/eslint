/**
 * `<=` — the fourth spelling of the same minimum.
 *
 * `pwd.length <= 5` rejects at five characters, so the minimum is six. The
 * comparison operator chosen by the author has no bearing on the policy's
 * strength, and enumerating only some of the four is how a rule ends up with a
 * pass rate that depends on coding style.
 */
import { ValidationError } from '../lib/errors.js';

export function checkLegacyPassword(pwd) {
  if (pwd.length <= 5) {
    throw new ValidationError('Password must be longer than 5 characters');
  }

  return { ok: true };
}
