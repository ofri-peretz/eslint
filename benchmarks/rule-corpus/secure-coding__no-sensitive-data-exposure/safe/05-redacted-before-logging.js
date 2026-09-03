/**
 * SAFE - The correct remediation: the payload is masked before it reaches the
 * logger, and only non-secret metadata is logged directly.
 */
import { logger } from '../lib/logger.js';

const REDACTED = '[redacted]';

function mask(record) {
  return { ...record, password: REDACTED, apiKey: REDACTED };
}

export function auditRequest(record) {
  logger.info('request handled', mask(record));
  logger.debug('request handled', { userId: record.userId, route: record.route });
}
