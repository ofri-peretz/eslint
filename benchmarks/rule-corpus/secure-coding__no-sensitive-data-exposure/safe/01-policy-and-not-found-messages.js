/**
 * SAFE - Prose that NAMES a credential without carrying one. All three were
 * false positives on the wild corpus: token.service.js:58, passport.js:14,
 * user.model.js:33. A validation message quoting a password policy is not a
 * password.
 */
export function assertToken(token) {
  if (!token) {
    throw new Error('Token not found');
  }
  if (typeof token !== 'string') {
    throw new Error('Invalid token type');
  }
  return token;
}

export function assertPasswordPolicy(candidate) {
  if (!/[a-z]/i.test(candidate) || !/\d/.test(candidate)) {
    throw new Error('Password must contain at least one letter and one number');
  }
  return candidate;
}
