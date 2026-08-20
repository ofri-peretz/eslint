/**
 * SAFE - Length comparisons on secrets are not merely allowed, they are REQUIRED
 * before `crypto.timingSafeEqual`, which throws when the buffers differ in
 * length. Reporting them would report the prerequisite of the fix.
 */
import crypto from 'node:crypto';

export function compareTokens(presentedToken, storedToken) {
  if (presentedToken.length !== storedToken.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(presentedToken), Buffer.from(storedToken));
}
