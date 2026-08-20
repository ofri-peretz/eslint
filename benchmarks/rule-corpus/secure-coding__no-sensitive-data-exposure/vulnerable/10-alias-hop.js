/**
 * VULNERABLE (adversarial) - One binding hop, and the alias is named after its
 * ROLE rather than its content. This is how the value is normally destructured
 * out of a payload before use, and it is the shape that decides whether a rule
 * follows values or reads names.
 */
import { logger } from '../lib/logger.js';

export function recordLoginFailure(account, attemptId) {
  const submitted = account.password;
  logger.warn('login failed', attemptId, submitted);
}
