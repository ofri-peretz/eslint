/**
 * SAFE - Everything logged here is metadata ABOUT a credential, never the
 * credential. A length and an expiry timestamp cannot be replayed.
 */
import { logger } from '../lib/logger.js';

export function auditSession(session, token) {
  logger.debug('token length', token.length);
  logger.debug('session expiry', session.expiresAt);
  logger.info('rotation due', { rotateAfterDays: 30 });
}
