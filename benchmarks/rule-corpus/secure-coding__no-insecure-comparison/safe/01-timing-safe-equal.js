/**
 * SAFE - The correct remediation, word for word from the rule's own fix message:
 * length check first (required, because timingSafeEqual throws on a mismatch),
 * then crypto.timingSafeEqual.
 */
import crypto from 'node:crypto';

export function verifyApiKey(presentedKey) {
  const expected = Buffer.from(process.env.SERVICE_API_KEY, 'utf8');
  const presented = Buffer.from(presentedKey, 'utf8');
  if (presented.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(presented, expected);
}
