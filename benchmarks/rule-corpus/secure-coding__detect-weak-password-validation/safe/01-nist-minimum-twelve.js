/**
 * SAFE — the policy this rule's own message prescribes: 12 characters plus a
 * strength estimate.
 *
 * If a rule reports the remediation it recommends, nobody keeps it enabled long
 * enough to benefit from the cases it gets right.
 */
import zxcvbn from 'zxcvbn';

const MIN_PASSWORD_LENGTH = 12;

export function validatePassword(password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, reason: 'Use at least 12 characters' };
  }

  const strength = zxcvbn(password);
  if (strength.score < 3) {
    return { valid: false, reason: strength.feedback.warning };
  }

  return { valid: true };
}
