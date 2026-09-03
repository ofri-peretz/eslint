/**
 * VULNERABLE (partial mitigation, judged honestly) - The length pre-check is
 * genuinely required before `timingSafeEqual`, but here it is followed by a
 * plain `===` rather than by `timingSafeEqual`. Equal lengths do not make a
 * short-circuiting comparison constant-time; the byte-at-a-time leak is intact.
 */
export function verifyResetToken(presentedToken, storedToken) {
  if (presentedToken.length !== storedToken.length) {
    return false;
  }
  return presentedToken === storedToken;
}
