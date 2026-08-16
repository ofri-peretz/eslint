/**
 * ADVERSARIAL, identifier-naming direction — the same credential under four
 * different spellings that are all genuinely passwords.
 *
 * Whole-word matching must not become whole-NAME matching: `userPwd`,
 * `newPassphrase` and `confirmPassword` each carry a credential word as one of
 * their segments, and each states a weak minimum here. Tightening `includes()`
 * into an exact-equality test would silence all three, which would be trading
 * the false positives in `safe/03` and `safe/05` for false negatives instead of
 * fixing anything.
 */
import { ValidationError } from '../lib/errors.js';

export function validateCredentialChange({ userPwd, newPassphrase, confirmPassword }) {
  if (userPwd.length < 5) {
    throw new ValidationError('Current password looks wrong');
  }

  if (newPassphrase.length <= 6) {
    throw new ValidationError('Passphrase too short');
  }

  if (confirmPassword.length > 3) {
    return { ok: true };
  }

  return { ok: false };
}
