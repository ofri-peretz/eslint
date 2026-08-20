/**
 * The threshold lives in a named constant — which is what a code reviewer asks
 * for, and what a linter that only reads numeric literals cannot follow.
 *
 * `MIN_PASSWORD_LENGTH` is a module `const` initialised to `6`. Its value is
 * fixed at build time and resolvable from this file alone; refusing to resolve
 * it means the better-written version of a weak policy is the one that escapes.
 */
const MIN_PASSWORD_LENGTH = 6;

export class PasswordPolicy {
  validate(newPassword) {
    if (newPassword.length >= MIN_PASSWORD_LENGTH) {
      return { valid: true };
    }
    return { valid: false, reason: `Minimum ${MIN_PASSWORD_LENGTH} characters` };
  }
}
