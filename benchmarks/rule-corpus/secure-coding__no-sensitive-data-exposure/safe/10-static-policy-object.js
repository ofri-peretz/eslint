/**
 * SAFE (adversarial) - Structured logging whose credential-named fields carry
 * CONSTANTS. Logging a rotation interval and a policy name exposes nothing; a
 * hardcoded secret would be a different rule's finding on a different CWE.
 */
import { logger } from '../lib/logger.js';

const REDACTED = '[redacted]';

export function reportPolicy(rotationDays) {
  logger.info('policy loaded', {
    passwordPolicy: 'strong',
    apiKeyRotationDays: 30,
    secret: REDACTED,
  });
  logger.debug('rotation', { rotateAfterDays: rotationDays });
}
